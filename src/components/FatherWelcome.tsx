"use client";

import { useEffect, useRef, useState } from "react";
import { isFatherEmail } from "@/lib/father-config";

// Set by the login page right before it redirects to /dashboard after a
// real sign-in (see markJustLoggedIn() in src/app/login/page.tsx). This
// component consumes (reads, then immediately clears) that flag — so the
// overlay only ever appears right after an actual login, never on a plain
// reload of an already-open dashboard tab, and it appears again every
// time he logs out and back in.
const JUST_LOGGED_IN_KEY = "shopkhata_just_logged_in";

type FatherWelcomeProps = {
  email?: string | null;
};

export default function FatherWelcome({ email }: FatherWelcomeProps) {
  const [show, setShow] = useState(false);
  const [closing, setClosing] = useState(false);
  // Remembers "yes, this was a fresh login" across React Strict Mode's
  // dev-only double-invoke of effects (mount → cleanup → mount again).
  // The FIRST invocation reads+clears the sessionStorage flag and records
  // the result here; its own timer gets cancelled by the phantom cleanup,
  // which is fine. The SECOND invocation sees this already-known result
  // and sets the timer that actually survives and fires. In production
  // (no Strict Mode double-invoke) there's only ever one invocation, and
  // it works the same way in a single pass.
  const pendingShowRef = useRef(false);

  useEffect(() => {
    if (!email) return;
    if (!isFatherEmail(email)) return;

    if (pendingShowRef.current) {
      const timer = window.setTimeout(() => setShow(true), 500);
      return () => window.clearTimeout(timer);
    }

    let justLoggedIn = false;
    try {
      justLoggedIn = sessionStorage.getItem(JUST_LOGGED_IN_KEY) === "1";
      if (justLoggedIn) sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
    } catch {
      // storage unavailable — treat as not a fresh login, stay silent
    }
    if (!justLoggedIn) return;

    pendingShowRef.current = true;
    const timer = window.setTimeout(() => setShow(true), 500);
    return () => window.clearTimeout(timer);
  }, [email]);

  const dismiss = () => {
    setClosing(true);
    window.setTimeout(() => {
      setShow(false);
      setClosing(false);
    }, 450);
  };

  if (!show) return null;

  return (
    <>
      {/*
        Protector-sheet backdrop: dims + blurs the dashboard (sidebar,
        amounts, everything) behind the card while it's up, so nothing
        underneath is readable until he dismisses it. It fades back to
        fully clear the moment "Enter Your Dashboard" is tapped.
      */}
      <div className={`father-wrapper ${closing ? "father-wrapper-close" : ""}`}>
        <div className="father-backdrop" onClick={dismiss} aria-hidden="true" />

        {/* Blue celebration particles */}
        <div className="father-particles">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className={`confetti confetti-${i % 5}`}
              style={{
                left: `${15 + Math.random() * 70}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        {/* Compact card */}
        <div className={`father-card ${closing ? "father-card-close" : ""}`}>
          <div className="card-accent" />

          {/* PHOTO */}
          <div className="photo-wrapper">
            <div className="photo-glow" />
            <div className="photo-ring">
              <div className="photo-container">
                <img src="/father-photo.jpg" alt="Dad" className="father-image" />
              </div>
            </div>
            <div className="heart">❤️</div>
          </div>

          {/* TEXT — each line staggers in on its own beat */}
          <div className="content">
            <div className="eyebrow line line-1">A SPECIAL MESSAGE FROM SAK COUNCIL</div>

            <h2 className="line line-2">
              Welcome, Dad <span>❤️</span>
            </h2>

            <div className="divider line line-3">
              <span />
              <b>✦</b>
              <span />
            </div>

            <p className="line line-4">
              This little app may keep your accounts organized,
              <br />
              but the reason behind it is much bigger.
            </p>

            <p className="second-message line line-5">
              I built it with love,
              <br />
              especially for you.
            </p>

            <div className="signature line line-6">— Subhan Anjum Khan</div>
          </div>

          {/* BUTTON */}
          <button className="dashboard-button line line-7" onClick={dismiss}>
            Enter Your Dashboard
            <span>→</span>
          </button>

          <div className="bottom-text line line-8">Made especially for you</div>
        </div>
      </div>

      <style jsx>{`
        /* ========================================
           TRANSPARENT WRAPPER — always invisible
        ======================================== */

        .father-wrapper {
          position: fixed;
          inset: 0;
          z-index: 999999;

          display: flex;
          align-items: center;
          justify-content: center;

          animation: wrapperIn 500ms ease forwards;
        }

        .father-wrapper-close {
          animation: wrapperOut 450ms ease forwards;
        }

        .father-backdrop {
          position: absolute;
          inset: 0;

          /* Matches the app's existing Modal component exactly:
             dark ink tint at 40% opacity + a light 2px blur. */
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);

          cursor: pointer;
        }

        /* ========================================
           PARTICLES
        ======================================== */

        .father-particles {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .confetti {
          position: absolute;
          top: 42%;
          width: 6px;
          height: 11px;
          border-radius: 2px;
          opacity: 0;
          animation: popper linear infinite;
        }

        .confetti-0 { background: #2563eb; }
        .confetti-1 { background: #3b82f6; }
        .confetti-2 { background: #60a5fa; }
        .confetti-3 { background: #93c5fd; }
        .confetti-4 { background: #1d4ed8; }

        /* ========================================
           CARD
        ======================================== */

        .father-card {
          position: relative;
          width: min(360px, calc(100vw - 40px));
          padding: 30px 26px 22px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(96, 165, 250, 0.35);
          box-shadow: 0 25px 70px rgba(30, 64, 175, 0.22), 0 8px 30px rgba(0, 0, 0, 0.08);
          text-align: center;
          pointer-events: auto;
          animation: cardIn 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .father-card-close {
          animation: cardOut 400ms ease forwards;
        }

        /* ========================================
           BLUE ACCENT
        ======================================== */

        .card-accent {
          position: absolute;
          top: 0;
          left: 50%;
          width: 70px;
          height: 3px;
          transform: translateX(-50%);
          border-radius: 0 0 10px 10px;
          background: linear-gradient(90deg, #1d4ed8, #60a5fa, #1d4ed8);
          box-shadow: 0 0 15px rgba(37, 99, 235, 0.45);
        }

        /* ========================================
           PHOTO — entrance + gentle idle float
        ======================================== */

        .photo-wrapper {
          position: relative;
          width: 100px;
          height: 100px;
          margin: 0 auto 18px;
          animation:
            photoIn 750ms cubic-bezier(0.16, 1, 0.3, 1) 150ms both,
            photoFloat 4.5s ease-in-out 900ms infinite;
        }

        .photo-glow {
          position: absolute;
          inset: -15px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.28), transparent 70%);
          filter: blur(12px);
          animation: glow 3s ease-in-out infinite alternate;
        }

        .photo-ring {
          position: relative;
          width: 100px;
          height: 100px;
          padding: 3px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1d4ed8, #60a5fa, #bfdbfe, #2563eb);
          box-shadow: 0 10px 25px rgba(37, 99, 235, 0.25);
        }

        .photo-container {
          width: 94px;
          height: 94px;
          overflow: hidden;
          border-radius: 50%;
          background: #e5e7eb;
        }

        .father-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        /* ========================================
           HEART
        ======================================== */

        .heart {
          position: absolute;
          right: -5px;
          bottom: -2px;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          border: 3px solid white;
          font-size: 14px;
          box-shadow: 0 6px 15px rgba(37, 99, 235, 0.3);
          animation: heartbeat 2s ease-in-out infinite;
        }

        /* ========================================
           CONTENT — each line reveals on its own beat
        ======================================== */

        .content {
          display: flex;
          flex-direction: column;
        }

        .line {
          opacity: 0;
          animation: lineIn 550ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .line-1 { animation-delay: 260ms; }
        .line-2 { animation-delay: 380ms; }
        .line-3 { animation-delay: 500ms; }
        .line-4 { animation-delay: 640ms; }
        .line-5 { animation-delay: 780ms; }
        .line-6 { animation-delay: 920ms; }
        .line-7 { animation-delay: 1080ms; }
        .line-8 { animation-delay: 1220ms; }

        .eyebrow {
          margin-bottom: 6px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: #6b7280;
        }

        h2 {
          margin: 0;
          font-size: 23px;
          line-height: 1.2;
          font-weight: 700;
          color: #111827;
        }

        h2 span {
          display: inline-block;
          animation: heartbeat 2s ease-in-out infinite;
        }

        .divider {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin: 13px 0 14px;
        }

        .divider span {
          width: 35px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #60a5fa);
        }

        .divider span:last-child {
          background: linear-gradient(90deg, #60a5fa, transparent);
        }

        .divider b {
          color: #2563eb;
          font-size: 9px;
        }

        .content p {
          margin: 0;
          color: #6b7280;
          font-size: 12.5px;
          line-height: 1.7;
        }

        .second-message {
          margin-top: 9px !important;
        }

        .signature {
          margin: 12px 0 19px;
          color: #2563eb;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 14px;
          font-style: italic;
        }

        /* ========================================
           BUTTON — subtle continuous glow pulse
        ======================================== */

        .dashboard-button {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 11px 16px;
          border: none;
          border-radius: 11px;
          background: linear-gradient(135deg, #1d4ed8, #3b82f6);
          color: white;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 9px 20px rgba(37, 99, 235, 0.25);
          transition: transform 180ms ease, box-shadow 180ms ease;
        }

        .dashboard-button:not(.line) {
          /* placeholder to keep specificity readable — no-op */
        }

        .dashboard-button {
          animation:
            lineIn 550ms cubic-bezier(0.16, 1, 0.3, 1) 1080ms both,
            buttonGlow 2.6s ease-in-out 1.6s infinite;
        }

        .dashboard-button:hover {
          transform: translateY(-2px) scale(1.015);
          box-shadow: 0 14px 30px rgba(37, 99, 235, 0.4);
        }

        .dashboard-button:active {
          transform: translateY(0) scale(0.98);
        }

        .dashboard-button span {
          font-size: 16px;
          transition: transform 180ms ease;
        }

        .dashboard-button:hover span {
          transform: translateX(4px);
        }

        /* ========================================
           BOTTOM TEXT
        ======================================== */

        .bottom-text {
          margin-top: 11px;
          font-size: 8px;
          letter-spacing: 0.1em;
          color: #a1a1aa;
        }

        /* ========================================
           ANIMATIONS
        ======================================== */

        @keyframes wrapperIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes wrapperOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(25px) scale(0.94); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes cardOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(15px) scale(0.97); }
        }

        @keyframes photoIn {
          from { opacity: 0; transform: scale(0.7) rotate(-5deg); }
          to { opacity: 1; transform: scale(1) rotate(0); }
        }

        @keyframes photoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        @keyframes lineIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        @keyframes glow {
          from { opacity: 0.4; transform: scale(0.9); }
          to { opacity: 0.8; transform: scale(1.08); }
        }

        @keyframes buttonGlow {
          0%, 100% { box-shadow: 0 9px 20px rgba(37, 99, 235, 0.25); }
          50% { box-shadow: 0 9px 28px rgba(37, 99, 235, 0.5); }
        }

        @keyframes popper {
          0% { opacity: 0; transform: translateY(0) translateX(0) rotate(0deg); }
          10% { opacity: 1; }
          100% { opacity: 0; transform: translateY(75vh) translateX(80px) rotate(540deg); }
        }

        @media (max-width: 480px) {
          .father-card {
            width: calc(100vw - 48px);
            padding: 27px 22px 20px;
          }
          h2 {
            font-size: 21px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .father-wrapper,
          .father-card,
          .photo-wrapper,
          .line,
          .dashboard-button,
          .heart,
          .photo-glow,
          .confetti {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </>
  );
}