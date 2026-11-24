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

## Open
- [ ] Deploy on Vercel: user chose assisted deployment; waiting for a Vercel token through the secure form.
- [x] Remove the visible Lovable sign-in option and all Lovable brand marks, including the browser-tab icon.
- [x] Create and apply a unique RAHAM logo and matching browser-tab icon.
- [x] Google sign-up and sign-in restored on both account modes and all hostnames; Google provider confirmed enabled.
- [x] Sign-up/sign-in screens: Google is the primary option ("Sign up with Google" / "Sign in with Google"); email stays available behind "Sign up with email instead". Reset and password-change screens still open with their fields. Verified in the browser.
- [x] Use the user-supplied crescent RAHAM logo.
- [x] Email sign-in verified end to end: correct password opens the private app, wrong password is rejected, sign-out returns to the public view. Email confirmation kept on, as chosen.

## Open
- [ ] Sync the newest commits to https://github.com/Fahadshaju/RAHAM-tracker: no GitHub access is available in this session, so the repo still has the earlier push.
- [ ] Complete a real Google sign-in: the button is verified in both modes, but the hosted preview is behind Lovable's login wall and localhost has no OAuth proxy, so the Google redirect and returning session remain unverified.
