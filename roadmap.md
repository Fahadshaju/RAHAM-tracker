# Roadmap

## Done
- [x] Repeating targets across selected months, stacked daily sections, and an auto-expanding desktop sidebar; private saves and independent daily completion verified after refresh.
- [x] Enlarge text and open up workspace spacing, with roomier rows and phone-friendly layouts.
- [x] Year view: month names above the grid; unlogged days no longer shaded (only progress shows). Month calendar untouched.
- [x] New tab "My plan": fill in task name + timings, saved as the day's task list.
- [x] Daily view: targets list with tick-to-complete; old istighfar/dhikr counters removed.
- [x] Copy tone: plainer, warmer wording.
- [x] Motion: drifting light, staggered entries, hover lift, progress sheen.
- [x] Auto-transcript: audio upload transcribes automatically when YouTube captions are unavailable.
- [x] Font: Plus Jakarta Sans (clean geometric sans from the uploaded mockup) across the whole site.
- [x] Removed the duplicated "Prayers offered" metric card.
- [x] Pushed the full codebase to https://github.com/Fahadshaju/RAHAM-tracker (119 files, main branch).
- [x] Vercel build verified locally: `NITRO_PRESET=vercel bun run build` produces `.vercel/output`; `vercel.json` sets the install and build commands.
- [x] Hold a prayer or target for quick settings; fixed-count targets use fill-in numeric fields without counters.
- [x] Remove the Jannat navigation tab while retaining the garden inside Today.
- [x] Support both hold and tap controls, with visible positive and negative marks for every prayer and target.

## Open
- [ ] Deploy on Vercel: user chose assisted deployment; waiting for a Vercel token through the secure form.
- [x] Remove the visible Lovable sign-in option and all Lovable brand marks, including the browser-tab icon.
- [x] Create and apply a unique RAHAM logo and matching browser-tab icon.
- [x] Google sign-up and sign-in restored on both account modes and all hostnames; Google provider confirmed enabled.
- [x] Sign-up/sign-in screens: Google is the primary option ("Sign up with Google" / "Sign in with Google"); email stays available behind "Sign up with email instead". Reset and password-change screens still open with their fields. Verified in the browser.
- [x] Use the user-supplied crescent RAHAM logo.
- [x] Email sign-in verified end to end: correct password opens the private app, wrong password is rejected, sign-out returns to the public view. Email confirmation kept on, as chosen.

## Open
- [ ] Deploy on Vercel: waiting for a Vercel token through the secure form.

## Done
- [x] Sync the newest work to https://github.com/Fahadshaju/RAHAM-tracker (main, commit f733294): 12 changed/new files uploaded, remote copy byte-checked against local.
- [x] Google sign-in: dropped at the user's request in favour of email-only auth, so no hosted Google redirect is pending.
- Quran juz open in an in-page reader (done)
- Istighfar main-page target, mobile speed-ups, GitHub push d809d91 (done)
