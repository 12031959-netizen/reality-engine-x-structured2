import Dashboard from "../features/dashboard/pages/Dashboard";
import DailyCheckIn from "../features/checkin/pages/DailyCheckIn";
import DailyMealLog from "../features/meals/pages/DailyMealLog";
import MoodLog from "../features/checkin/pages/MoodLog";
import WearableData from "../features/wearable/pages/WearableData";
import DailyHistory from "../features/history/pages/DailyHistory";
import Analytics from "../features/analytics/pages/Analytics";
import Predictions from "../features/predictions/pages/Predictions";
import FailurePrediction from "../features/failure/pages/FailurePrediction";
import UserDashboard from "../features/account/pages/UserDashboard";
import Feedback from "../features/feedback/pages/Feedback";
import AboutUs from "../features/about/pages/AboutUs";
import NotificationCenter from "../features/notifications/components/NotificationCenter";
import Settings from "../features/settings/pages/Settings";
import AdminDashboard from "../features/admin/pages/AdminDashboard";
import UsersAdmin from "../features/admin/pages/admin/Users";
import DietsAdmin from "../features/admin/pages/admin/Diets";
import CheckinsAdmin from "../features/admin/pages/admin/Checkins";
import WearablesAdmin from "../features/admin/pages/admin/Wearables";
import FeedbackAdmin from "../features/admin/pages/admin/Feedback";
import NotificationsAdmin from "../features/admin/pages/admin/Notifications";
import UserDataAdmin from "../features/admin/pages/admin/UserData";
import DietAssistant from "../features/assistant/pages/DietAssistant";
import DietPlans from "../features/plans/pages/DietPlans";
import Progress from "../features/progress/pages/Progress";
import {
  Activity,
  BarChart3,
  BellRing,
  Bot,
  Brain,
  CalendarDays,
  ClipboardCheck,
  Database,
  Gauge,
  Home,
  Info,
  KeyRound,
  LayoutList,
  LineChart as LineChartIcon,
  MessageSquare,
  Settings as SettingsIcon,
  ShieldCheck,
  Utensils,
  UserRound,
  Watch
} from "lucide-react";

const routes = [
  {
    key: "admin",
    label: "Admin",
    icon: ShieldCheck,
    component: AdminDashboard,
    roles: ["admin"]
  },
  {
    key: "admin-users",
    label: "User Manager",
    icon: UserRound,
    component: UsersAdmin,
    roles: ["admin"]
  },
  {
    key: "admin-diets",
    label: "Diet Manager",
    icon: ClipboardCheck,
    component: DietsAdmin,
    roles: ["admin"]
  },
  {
    key: "admin-checkins",
    label: "Check-in Manager",
    icon: Activity,
    component: CheckinsAdmin,
    roles: ["admin"]
  },
  {
    key: "admin-user-data",
    label: "User Data",
    icon: Database,
    component: UserDataAdmin,
    roles: ["admin"]
  },
  {
    key: "admin-wearables",
    label: "Mobile Data Manager",
    icon: Watch,
    component: WearablesAdmin,
    roles: ["admin"]
  },
  {
    key: "admin-feedback",
    label: "Feedback Manager",
    icon: MessageSquare,
    component: FeedbackAdmin,
    roles: ["admin"]
  },
  {
    key: "admin-notifications",
    label: "Notification Manager",
    icon: BellRing,
    component: NotificationsAdmin,
    roles: ["admin"]
  },
  {
    key: "dashboard",
    label: "Dashboard",
    icon: Home,
    component: Dashboard,
    roles: ["user"]
  },
  {
    key: "plans",
    label: "Diet Plans",
    icon: LayoutList,
    component: DietPlans,
    roles: ["user"]
  },
  {
    key: "checkin",
    label: "Daily Check-In",
    icon: ClipboardCheck,
    component: DailyCheckIn,
    roles: ["user"]
  },
  {
    key: "meals",
    label: "Meal Log",
    icon: Utensils,
    component: DailyMealLog,
    roles: ["user"]
  },
  {
    key: "moodlog",
    label: "Mood Log",
    icon: Brain,
    component: MoodLog,
    roles: ["user"]
  },
  {
    key: "wearable",
    label: "Mobile Data",
    icon: Watch,
    component: WearableData,
    roles: ["user"]
  },
  {
    key: "progress",
    label: "Progress Tracking",
    icon: LineChartIcon,
    component: Progress,
    roles: ["user"]
  },
  {
    key: "history",
    label: "Daily History",
    icon: CalendarDays,
    component: DailyHistory,
    roles: ["user"]
  },
  {
    key: "analytics",
    label: "Analytics",
    icon: BarChart3,
    component: Analytics,
    roles: ["user"]
  },
  {
    key: "predictions",
    label: "Predictions",
    icon: Brain,
    component: Predictions,
    roles: ["user"]
  },
  {
    key: "assistant",
    label: "AI Assistant",
    icon: Bot,
    component: DietAssistant,
    roles: ["user"]
  },
  {
    key: "failure",
    label: "Failure Risk",
    icon: Gauge,
    component: FailurePrediction,
    roles: ["user"]
  },
  {
    key: "account",
    label: "Users / Pass",
    icon: KeyRound,
    component: UserDashboard,
    roles: ["user"]
  },
  {
    key: "feedback",
    label: "Feedback",
    icon: MessageSquare,
    component: Feedback,
    roles: ["user"]
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: BellRing,
    component: NotificationCenter,
    roles: ["user"]
  },
  {
    key: "about",
    label: "About Us",
    icon: Info,
    component: AboutUs,
    roles: ["user"]
  },
  {
    key: "settings",
    label: "Settings",
    icon: SettingsIcon,
    component: Settings,
    roles: ["user"]
  }
];

export default routes;
