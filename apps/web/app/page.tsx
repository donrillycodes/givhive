"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Fraunces, DM_Sans } from "next/font/google";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { authApi } from "@/lib/api";
import "./landing.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

export default function LandingPage() {
  const router = useRouter();

  // ── Auth redirect: if already signed in, send to the right dashboard ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) return;
      try {
        const res = await authApi.getMe();
        const role = res.data?.data?.user?.role as string | undefined;
        if (role === "NGO") router.replace("/ngo");
        else if (role === "ADMIN" || role === "SUPER_ADMIN")
          router.replace("/admin");
        // DONOR or unknown role: keep them on the landing
      } catch {
        // silently ignore — show the landing
      }
    });
    return () => unsub();
  }, [router]);

  // ── Scroll behavior: nav shadow + intersection observer fade-up ──
  useEffect(() => {
    const nav = document.getElementById("gh-nav");

    const onScroll = () => {
      if (!nav) return;
      nav.classList.toggle("scrolled", window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.15 },
    );
    document
      .querySelectorAll(".gh-landing .step, .gh-landing .fade-up")
      .forEach((el) => io.observe(el));

    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <div className={`gh-landing ${fraunces.variable} ${dmSans.variable}`}>
      {/* NAV */}
      <nav id="gh-nav">
        <Link href="/" className="nav-logo">
          <svg
            className="hex-icon"
            viewBox="0 0 34 34"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17 2 L31 10 L31 26 L17 34 L3 26 L3 10 Z" fill="#1a7a4a" />
            <path d="M17 8 L25 13 L25 21 L17 26 L9 21 L9 13 Z" fill="#2d9e64" />
            <path
              d="M17 13 L21 15.5 L21 20 L17 22.5 L13 20 L13 15.5 Z"
              fill="#fff"
              opacity="0.9"
            />
          </svg>
          GivHive
        </Link>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#donors">Donors</a>
          <a href="#ngos">For NGOs</a>
          <Link href="/login" className="nav-cta">
            NGO Sign in →
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">
          <span className="dot" />
          Live in Winnipeg, Canada
        </div>
        <h1>
          Give food.
          <br />
          <em>Change lives.</em>
          <br />
          Right here.
        </h1>
        <p>
          GivHive connects Winnipeg food donors with verified local charities —
          making every donation simple, trackable, and impactful.
        </p>
        <div className="hero-actions">
          <a href="#how" className="btn-primary">
            Start donating
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8H13M9 4L13 8L9 12"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <Link href="/register" className="btn-ghost">
            Register your NGO
          </Link>
        </div>
        <div className="hero-scroll">
          <span>Scroll</span>
          <div className="scroll-arrow" />
        </div>
      </section>

      {/* STATS BAR */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-num">500+</span>
          <span className="stat-label">Meals facilitated</span>
        </div>
        <div className="stat-item">
          <span className="stat-num">12</span>
          <span className="stat-label">Verified NGOs</span>
        </div>
        <div className="stat-item">
          <span className="stat-num">$0</span>
          <span className="stat-label">Platform fee for donors</span>
        </div>
        <div className="stat-item">
          <span className="stat-num">100%</span>
          <span className="stat-label">Verified charities</span>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="how" id="how">
        <div>
          <p className="section-label">How it works</p>
          <h2 className="section-title">
            Simple giving, <em>real impact</em>
          </h2>
          <p className="section-sub">
            No middlemen. No paperwork. Just you connecting directly with
            Winnipeg&apos;s most trusted food charities.
          </p>
          <div className="steps">
            <div className="step">
              <div className="step-num">01</div>
              <div className="step-content">
                <h3>Browse verified NGOs</h3>
                <p>
                  Every partner charity is manually verified by our team — see
                  their needs, current campaigns, and impact in real time.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">02</div>
              <div className="step-content">
                <h3>Pledge food or cash</h3>
                <p>
                  Donate surplus food from your home, business, or event — or
                  make a secure cash donation via Stripe that goes directly to
                  the charity.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">03</div>
              <div className="step-content">
                <h3>Track your impact</h3>
                <p>
                  Get updates from the NGO, see your donation history, and watch
                  your contributions make a difference in your community.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="phone-wrap">
          <div className="phone-outer">
            <div className="phone-inner">
              <div className="phone-status">
                <span className="phone-logo">GivHive</span>
                <div className="phone-bell" />
              </div>
              <div className="phone-body">
                <p className="phone-greeting">Good morning, Emmanuel 👋</p>
                <p className="phone-headline">Where will you give today?</p>
                <div className="phone-card">
                  <div className="phone-card-icon">🌾</div>
                  <div>
                    <div className="phone-card-title">Winnipeg Harvest</div>
                    <div className="phone-card-sub">
                      Needs: canned goods · vegetables
                    </div>
                  </div>
                </div>
                <div className="phone-card">
                  <div className="phone-card-icon">🏠</div>
                  <div>
                    <div className="phone-card-title">Siloam Mission</div>
                    <div className="phone-card-sub">
                      Cash donations open · 3 drives active
                    </div>
                  </div>
                </div>
                <div className="phone-card">
                  <div className="phone-card-icon">🤝</div>
                  <div>
                    <div className="phone-card-title">Agape Table</div>
                    <div className="phone-card-sub">
                      Food pledge · pickup available
                    </div>
                  </div>
                </div>
                <div className="phone-donate-btn">Donate Now →</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION QUOTE */}
      <div className="mission">
        <blockquote>
          &ldquo;No family in Winnipeg should go hungry when there&apos;s
          surplus food just around the corner. GivHive closes that gap —{" "}
          <strong>one donation at a time.</strong>&rdquo;
          <cite>— GivHive Mission Statement</cite>
        </blockquote>
      </div>

      {/* AUDIENCE SPLIT */}
      <section className="audience" id="donors">
        <div className="audience-card">
          <div className="audience-icon">🫙</div>
          <h3>
            For <em>donors</em> &amp; the community
          </h3>
          <p>
            Whether you have a bag of groceries to spare or want to make a cash
            donation, GivHive makes giving as easy as ordering takeout.
          </p>
          <ul className="feature-list">
            <li>
              <span className="check" />
              Browse real NGO needs in real time
            </li>
            <li>
              <span className="check" />
              Secure cash donations via Stripe
            </li>
            <li>
              <span className="check" />
              Pledge surplus food — charity arranges pickup
            </li>
            <li>
              <span className="check" />
              Full donation history &amp; receipts
            </li>
            <li>
              <span className="check" />
              Zero platform fees for donors
            </li>
          </ul>
          <a href="#" className="audience-cta">
            Download the app <span className="arrow">→</span>
          </a>
        </div>

        <div className="audience-card dark" id="ngos">
          <div className="audience-icon">🏢</div>
          <h3>
            For <em>NGOs</em> &amp; welfare teams
          </h3>
          <p>
            A complete management dashboard to track pledges, manage donor
            relationships, and keep your community updated on your work.
          </p>
          <ul className="feature-list">
            <li>
              <span className="check" />
              Real-time food pledge tracking
            </li>
            <li>
              <span className="check" />
              Donor communication tools
            </li>
            <li>
              <span className="check" />
              Secure, role-based team access
            </li>
            <li>
              <span className="check" />
              Campaign &amp; drive management
            </li>
            <li>
              <span className="check" />
              Stripe payouts directly to your account
            </li>
          </ul>
          <Link href="/register" className="audience-cta">
            Register your NGO <span className="arrow">→</span>
          </Link>
        </div>
      </section>

      {/* NGO PARTNERS */}
      <section className="ngos fade-up">
        <p className="section-label">Our partners</p>
        <h2 className="section-title">
          Winnipeg&apos;s <em>trusted</em> charities
        </h2>
        <p className="section-sub">
          Every NGO on GivHive is manually vetted. Your donation always reaches
          a legitimate, established organisation.
        </p>
        <div className="ngo-grid">
          <div className="ngo-card">
            <div className="ngo-icon">🌾</div>
            <div className="ngo-name">Winnipeg Harvest</div>
            <div className="ngo-type">Food Bank · Founded 1984</div>
            <div className="ngo-badge">
              <span className="verified-dot" />
              Verified partner
            </div>
          </div>
          <div className="ngo-card">
            <div className="ngo-icon">🏠</div>
            <div className="ngo-name">Siloam Mission</div>
            <div className="ngo-type">Shelter &amp; Food Aid</div>
            <div className="ngo-badge">
              <span className="verified-dot" />
              Verified partner
            </div>
          </div>
          <div className="ngo-card">
            <div className="ngo-icon">🤝</div>
            <div className="ngo-name">Agape Table</div>
            <div className="ngo-type">Community Meals</div>
            <div className="ngo-badge">
              <span className="verified-dot" />
              Verified partner
            </div>
          </div>
          <div
            className="ngo-card"
            style={{
              borderStyle: "dashed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              minHeight: 120,
            }}
          >
            <div>
              <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>+</div>
              <div
                className="ngo-name"
                style={{ color: "var(--text-muted)", fontWeight: 500 }}
              >
                Your NGO here
              </div>
              <Link
                href="/register"
                style={{
                  fontSize: "0.78rem",
                  color: "var(--green-600)",
                  textDecoration: "none",
                }}
              >
                Apply to join →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta fade-up">
        <h2>
          Ready to make
          <br />
          <em>Winnipeg</em> better?
        </h2>
        <p>Join hundreds of Winnipeggers already giving through GivHive.</p>
        <div className="cta-group">
          <a href="#" className="btn-dark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"
                fill="currentColor"
              />
            </svg>
            Get the app
          </a>
          <Link href="/register" className="btn-outline">
            Register an NGO →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div>
          <a href="#" className="footer-logo">
            GivHive
          </a>
          <p className="footer-tagline">
            Connecting food donors with Winnipeg communities.
          </p>
        </div>
        <div className="footer-links">
          <a href="#how">How it works</a>
          <Link href="/login">NGO Dashboard</Link>
          <Link href="/register">Register NGO</Link>
          <Link href="/privacy">Privacy</Link>
          <a href="#">Contact</a>
        </div>
        <p className="footer-copy">© 2026 GivHive · Winnipeg, Manitoba</p>
      </footer>
    </div>
  );
}
