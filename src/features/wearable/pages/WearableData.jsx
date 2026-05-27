import { useRef, useState } from "react";
import { Bluetooth, FileUp, Smartphone } from "lucide-react";
import SectionHeader from "../../../components/shared/SectionHeader";
import { useAuth } from "../../../hooks/useAuth";
import WearableCard from "../components/WearableCard";

const emptyWearableData = {
  device: "",
  steps: "",
  heartRate: "",
  activeMinutes: "",
  recoveryScore: "",
  source: "Phone Health import",
  appleHealthActive: false,
  iphoneActive: false,
  exportActive: false,
  bluetoothActive: false
};

function valueOrMissing(value, suffix = "") {
  return value ? `${value}${suffix}` : "Not entered";
}

function normalizeImportedData(data) {
  return {
    device: data.device || data.sourceName || "Phone Health",
    steps: data.steps || data.stepCount || data.StepCount || "",
    heartRate: data.heartRate || data.restingHeartRate || data.HeartRate || "",
    activeMinutes:
      data.activeMinutes || data.exerciseMinutes || data.AppleExerciseTime || "",
    recoveryScore: data.recoveryScore || data.recovery || "",
    source: data.source || "Phone Health import",
    appleHealthActive: Boolean(data.appleHealthActive),
    iphoneActive: Boolean(data.iphoneActive),
    exportActive: true
  };
}

function parseCsvHealthData(text) {
  const [headerLine, ...rows] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(",").map((header) => header.trim());
  const latestRow = rows.at(-1);

  if (!latestRow) {
    throw new Error("The CSV file does not contain health data rows.");
  }

  return headers.reduce((data, header, index) => {
    data[header] = latestRow.split(",")[index]?.trim() || "";
    return data;
  }, {});
}

function parseAppleHealthXml(text) {
  const xml = new DOMParser().parseFromString(text, "text/xml");
  const records = Array.from(xml.querySelectorAll("Record"));

  if (!records.length) {
    throw new Error("No Health records were found in this XML file.");
  }

  const latestDate = records.reduce((latest, record) => {
    const startDate = record.getAttribute("startDate");
    return startDate && startDate > latest ? startDate.slice(0, 10) : latest;
  }, "");

  const recordsForLatestDay = records.filter((record) =>
    record.getAttribute("startDate")?.startsWith(latestDate)
  );

  let steps = 0;
  let activeMinutes = 0;
  let heartRateTotal = 0;
  let heartRateCount = 0;
  let hasAppleWatchRecords = false;

  recordsForLatestDay.forEach((record) => {
    const type = record.getAttribute("type") || "";
    const sourceName = record.getAttribute("sourceName") || "";
    const value = Number(record.getAttribute("value") || 0);

    if (sourceName.toLowerCase().includes("watch")) {
      hasAppleWatchRecords = true;
    }

    if (type.includes("StepCount")) {
      steps += value;
    }

    if (type.includes("AppleExerciseTime")) {
      activeMinutes += value;
    }

    if (type.includes("HeartRate")) {
      heartRateTotal += value;
      heartRateCount += 1;
    }
  });

  return {
    device: hasAppleWatchRecords ? "iPhone via Apple Health" : "iPhone Health",
    steps: steps ? Math.round(steps).toString() : "",
    activeMinutes: activeMinutes ? Math.round(activeMinutes).toString() : "",
    heartRate: heartRateCount
      ? Math.round(heartRateTotal / heartRateCount).toString()
      : "",
    source: hasAppleWatchRecords
      ? `iPhone Health export (${latestDate || "latest day"})`
      : `iPhone Health export (${latestDate || "latest day"})`,
    appleHealthActive: true,
    iphoneActive: hasAppleWatchRecords,
    exportActive: true
  };
}

function parseHealthFile(file, text) {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".json")) {
    return normalizeImportedData(JSON.parse(text));
  }

  if (fileName.endsWith(".csv")) {
    return normalizeImportedData(parseCsvHealthData(text));
  }

  if (fileName.endsWith(".xml") || text.trim().startsWith("<?xml")) {
    return normalizeImportedData(parseAppleHealthXml(text));
  }

  throw new Error("Use a JSON, CSV, or unzipped Apple Health export.xml file.");
}

function parseHeartRate(value) {
  const flags = value.getUint8(0);
  const is16Bit = flags & 0x1;

  return is16Bit ? value.getUint16(1, true) : value.getUint8(1);
}

export default function WearableData() {
  const { account, saveWearableData } = useAuth();
  const fileInputRef = useRef(null);
  const [saved, setSaved] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [appConnectionMessage, setAppConnectionMessage] = useState("");
  const [bluetoothMessage, setBluetoothMessage] = useState("");
  const [bluetoothError, setBluetoothError] = useState("");
  const wearableData = account.wearableData || {};
  const wearableLogs = (account?.dailyHistory || [])
    .filter((item) => item.wearableData)
    .map((item) => ({
      date: item.date,
      ...item.wearableData
    }));

  async function saveData(data) {
    const result = await saveWearableData(data);
    if (result.ok) {
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } else {
        setImportError(result.message || "Failed to save mobile data");
    }
  }

  function handleHealthImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const importedData = parseHealthFile(file, String(reader.result || ""));
        const nextWearableData = {
          ...emptyWearableData,
          ...importedData
        };

        saveData(nextWearableData);
        setAppConnectionMessage("");
        setImportError("");
        setImportMessage("Phone health data imported and saved.");
      } catch (error) {
        setImportMessage("");
        setImportError(error.message);
      }
    };

    reader.readAsText(file);
  }

  function handleAppConnection() {
    setImportError("");
    setBluetoothError("");
    setAppConnectionMessage(
      "Automatic iPhone Health sync needs a native iPhone app with HealthKit permission. This website is ready to receive that data through the backend; until that app exists, use the file upload option here."
    );
  }

  async function handleBluetoothConnect() {
    setBluetoothError("");
    setBluetoothMessage("");

    if (!navigator.bluetooth) {
      setBluetoothError(
        "Web Bluetooth is not supported in this browser. Try Chrome or Edge on desktop/Android."
      );
      return;
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ["heart_rate"] }]
      });

      setBluetoothMessage(`Connecting to ${device.name || "Bluetooth sensor"}...`);

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService("heart_rate");
      const characteristic = await service.getCharacteristic(
        "heart_rate_measurement"
      );

      characteristic.addEventListener("characteristicvaluechanged", (event) => {
        const heartRate = parseHeartRate(event.target.value).toString();

        saveData({
          ...emptyWearableData,
          ...wearableData,
          device: device.name || "Bluetooth heart-rate sensor",
          heartRate,
          source: "Bluetooth heart-rate sensor",
          bluetoothActive: true
        });

        setBluetoothMessage(`Bluetooth heart rate received: ${heartRate} bpm`);
      });

      await characteristic.startNotifications();
      setBluetoothMessage(
        `${device.name || "Bluetooth sensor"} connected. Waiting for heart-rate data...`
      );
    } catch (error) {
      setBluetoothError(error.message || "Bluetooth connection failed.");
    }
  }

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Mobile data integration"
        title="Mobile Data"
        description="Choose one source. The app will save the data here and use it in Analytics, Predictions, and Failure Risk."
      />

      <section className="panel wearable-source-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Data source</p>
            <h2>Connect your phone, watch, or file</h2>
          </div>
        </div>

        <div className="wearable-source-grid">
          <article className="wearable-source-card">
            <div className="stat-icon">
              <Smartphone size={22} />
            </div>
            <div>
              <p className="eyebrow">Phone app</p>
              <h3>Connect iPhone / Health app</h3>
              <p>
                Use this path when a native iPhone app is connected to Apple
                Health and sends the data to this website.
              </p>
            </div>
            <button
              className="btn btn-md btn-secondary"
              type="button"
              onClick={handleAppConnection}
            >
              Check App Connection
            </button>
          </article>

          <article className="wearable-source-card wearable-source-card-primary">
            <div className="stat-icon">
              <FileUp size={22} />
            </div>
            <div>
              <p className="eyebrow">iPhone / phone / file</p>
              <h3>Upload health export</h3>
              <p>
                Upload iPhone Health <strong>export.xml</strong>, JSON, or CSV.
                The page extracts steps, heart rate, active minutes, and
                recovery when they exist.
              </p>
            </div>
            <button
              className="btn btn-md btn-primary"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Health File
            </button>
            <input
              ref={fileInputRef}
              className="visually-hidden"
              type="file"
              accept=".json,.csv,.xml,.txt"
              onChange={handleHealthImport}
            />
          </article>

          <article className="wearable-source-card">
            <div className="stat-icon">
              <Bluetooth size={22} />
            </div>
            <div>
              <p className="eyebrow">Bluetooth</p>
              <h3>Connect heart sensor</h3>
              <p>
                Connect a compatible BLE heart-rate strap or sensor. iPhone
                health history still needs Health export or an iPhone app.
              </p>
            </div>
            <button
              className="btn btn-md btn-secondary"
              type="button"
              onClick={handleBluetoothConnect}
            >
              Connect Sensor
            </button>
          </article>
        </div>

        {appConnectionMessage && (
          <div className="toast toast-info">{appConnectionMessage}</div>
        )}
        {importMessage && <div className="toast toast-success">{importMessage}</div>}
        {importError && <div className="toast toast-error">{importError}</div>}
        {bluetoothMessage && (
          <div className="toast toast-success">{bluetoothMessage}</div>
        )}
        {bluetoothError && <div className="toast toast-error">{bluetoothError}</div>}
        {saved && <div className="toast toast-success">Mobile data saved.</div>}
      </section>

      <section className="stats-grid">
        <WearableCard
          label="Steps"
          value={valueOrMissing(wearableData.steps)}
          description={wearableData.source || "Not connected"}
        />

        <WearableCard
          label="Heart Rate"
          value={valueOrMissing(wearableData.heartRate, " bpm")}
          description={wearableData.source || "Not connected"}
        />

        <WearableCard
          label="Active Minutes"
          value={valueOrMissing(wearableData.activeMinutes, " min")}
          description={wearableData.source || "Not connected"}
        />

        <WearableCard
          label="Recovery"
          value={valueOrMissing(wearableData.recoveryScore, "%")}
          description={wearableData.source || "Not connected"}
        />
      </section>

      <article className="panel">
        <p className="eyebrow">Device</p>
        <h2>{wearableData.device || "Not connected"}</h2>
        <p>
          {wearableData.savedAt
            ? `Last saved: ${new Date(wearableData.savedAt).toLocaleString()}`
            : "Import iPhone health data to show it here."}
        </p>
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Saved mobile data</p>
            <h2>History</h2>
          </div>
        </div>

        {wearableLogs.length === 0 ? (
          <p className="text-muted">No mobile data records saved yet.</p>
        ) : (
          <div className="profile-summary">
            {wearableLogs.map((log) => (
              <div key={log.date}>
                <span>{log.date}</span>
                <strong>{valueOrMissing(log.steps)} steps</strong>
                <p className="text-muted">
                  {valueOrMissing(log.heartRate, " bpm")} heart rate,{" "}
                  {valueOrMissing(log.activeMinutes, " min")} active
                </p>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
