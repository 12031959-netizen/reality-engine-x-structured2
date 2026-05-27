import { Activity, Brain, HeartPulse, ShieldCheck } from "lucide-react";
import SectionHeader from "../../../components/shared/SectionHeader";

const values = [
  {
    title: "Personalized nutrition",
    description:
      "Reality Engine X uses profile, behavior, and mobile signals to support diet plans that fit the person, not just the calorie target.",
    icon: HeartPulse
  },
  {
    title: "Failure prevention",
    description:
      "The system watches stress, sleep, cravings, and consistency so users can react before a hard day becomes a setback.",
    icon: ShieldCheck
  },
  {
    title: "Simple daily action",
    description:
      "The dashboard turns complex health signals into clear check-ins, recommendations, predictions, and progress views.",
    icon: Activity
  }
];

export default function AboutUs() {
  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="About us"
        title="Built for smarter diet decisions"
        description="Reality Engine X is a diet intelligence dashboard designed to help users understand their body, habits, and risk signals while working toward a nutrition goal."
      />

      <section className="hero-card about-hero">
        <div>
          <p className="eyebrow">Our mission</p>
          <h2>Make diet progress easier to understand and harder to lose.</h2>
          <p>
            Most people do not fail because they lack effort. They fail because
            the warning signs arrive quietly: low sleep, high stress, strong
            cravings, missed meals, or inconsistent tracking. This app brings
            those signals together in one place.
          </p>
        </div>

        <div className="about-badge">
          <Brain size={34} />
          <span>AI-guided diet insights</span>
        </div>
      </section>

      <section className="about-grid">
        {values.map((value) => {
          const Icon = value.icon;

          return (
            <article className="panel about-card" key={value.title}>
              <div className="stat-icon">
                <Icon size={22} />
              </div>
              <h2>{value.title}</h2>
              <p>{value.description}</p>
            </article>
          );
        })}
      </section>

      <section className="two-column">
        <article className="panel">
          <p className="eyebrow">Who it helps</p>
          <h2>Users building better nutrition habits</h2>
          <p>
            The app is useful for people trying to lose fat, gain muscle,
            maintain weight, improve health markers, or understand why a plan is
            becoming difficult to follow.
          </p>
        </article>

        <article className="panel">
          <p className="eyebrow">What we believe</p>
          <h2>Data should feel practical</h2>
          <p>
            Health dashboards should not overwhelm the user. Reality Engine X
            focuses on the information that can guide the next decision: what to
            eat, what to adjust, and what risk to prevent.
          </p>
        </article>
      </section>
    </div>
  );
}
