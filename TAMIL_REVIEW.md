# Tamil text review

Every Tamil string shown on the site, in the printable PDF and in the calendar files. All of it lives in `src/content.json` under `text.ta`; edit it there and nothing else needs to change.

Please ask a native speaker to check each row: spelling, register (the invitation uses the respectful தங்கள் form), and whether the phrasing sounds natural for a Tamil wedding invitation. Tick the box when a row is approved.

Two derived strings are built in code from the rows below:
- Times: `time.*` word + clock, for example `காலை 6:00 – 7:30 (இந்திய நேரம்)` for the muhurtham.
- Reception time line: formatted time + `reception.timeSuffix`, for example `மாலை 7:00 முதல் (இந்திய நேரம்)`.

| OK | Key | English | Tamil | Notes |
| :-: | --- | --- | --- | --- |
| [ ] | `pageTitle` | Akash & Iswaryalakshmi \| Wedding Invitation | ஆகாஷ் & ஐஸ்வர்யலட்சுமி \| திருமண அழைப்பிதழ் | Browser tab title when Tamil is selected. |
| [ ] | `groom` | Akash | ஆகாஷ் | Transliteration of "Akash". ஆகாஷ் is the usual spelling. |
| [ ] | `bride` | Iswaryalakshmi | ஐஸ்வர்யலட்சுமி | Transliteration of "Iswaryalakshmi". Alternatives: ஐஸ்வர்யலக்ஷ்மி (with க்ஷ). Please confirm the spelling the family uses. |
| [ ] | `groomFull` | Akash | ஆகாஷ் | Full name line under the names and in the PDF. |
| [ ] | `brideFull` | Iswaryalakshmi S. | ச. ஐஸ்வர்யலட்சுமி | The initial "S." is written as ச. and placed before the name, as is common in Tamil. Confirm the correct Tamil letter for the initial (ச / ஸ / சு). |
| [ ] | `kicker` | Together with our families | எங்கள் குடும்பத்தினருடன் இணைந்து | Literal: "Together with our families". |
| [ ] | `invite` | we joyfully invite you to celebrate our wedding | எங்கள் திருமண விழாவிற்குத் தங்களை அன்புடன் அழைக்கிறோம் | Literal: "We lovingly invite you to our wedding celebration". Formal register (தங்களை). |
| [ ] | `datesShort` | 29 & 30 October 2026 · Chennai | அக்டோபர் 29 & 30, 2026 · சென்னை | Date format "October 29 & 30, 2026 · Chennai". |
| [ ] | `scrollHint` | Scroll | கீழே தொடரவும் | Tiny hint under the names: "continue below". |
| [ ] | `reception.eyebrow` | Thursday evening | வியாழன் மாலை | "Thursday evening". |
| [ ] | `reception.title` | Wedding Reception | திருமண வரவேற்பு | "Wedding reception". |
| [ ] | `reception.date` | Thursday, 29 October 2026 | வியாழக்கிழமை, 29 அக்டோபர் 2026 | Full weekday + date. |
| [ ] | `reception.timeSuffix` | onwards | முதல் | Follows the time: "மாலை 7:00 முதல்" = "from 7 PM". |
| [ ] | `reception.note` | Join us as the lamps are lit and the celebrations begin. | தீபங்கள் ஏற்றப்பட்டு கொண்டாட்டம் தொடங்கும் வேளையில் எங்களுடன் இணையுங்கள். | "Join us as the lamps are lit and the celebration begins." |
| [ ] | `muhurtham.eyebrow` | Friday at sunrise | வெள்ளி அதிகாலை | "Friday early morning". |
| [ ] | `muhurtham.title` | Muhurtham | திருமண முகூர்த்தம் | "Wedding muhurtham". |
| [ ] | `muhurtham.date` | Friday, 30 October 2026 | வெள்ளிக்கிழமை, 30 அக்டோபர் 2026 |  |
| [ ] | `muhurtham.lagnam` | Thula lagnam | துலா லக்னம் | Shown under the muhurtham time, in the PDF and in the calendar entry. |
| [ ] | `muhurtham.note` | Bless us as we begin our life together. | எங்கள் புதிய வாழ்க்கையின் தொடக்கத்தில் வருகை தந்து ஆசீர்வதியுங்கள். | "Please come and bless us at the start of our new life." |
| [ ] | `timeZone` | IST | இந்திய நேரம் | Added in brackets after every time: `மாலை 7:00 முதல் (இந்திய நேரம்)`. |
| [ ] | `venueLabel` | Venue | இடம் |  |
| [ ] | `venue` | J.J. Palace, GNT Road, Redhills, Chennai | ஜே.ஜே. பேலஸ், ஜி.என்.டி. சாலை, செங்குன்றம் (ரெட்ஹில்ஸ்), சென்னை | Redhills written as செங்குன்றம் with (ரெட்ஹில்ஸ்) so both names are recognisable. |
| [ ] | `timeLabel` | Time | நேரம் |  |
| [ ] | `details.eyebrow` | Both events | இரு நிகழ்வுகளும் | "Both events". |
| [ ] | `details.title` | We look forward to celebrating with you | தங்கள் வருகையை அன்புடன் எதிர்நோக்குகிறோம் | "We lovingly look forward to your presence." |
| [ ] | `details.maps` | Open in Google Maps | Google Maps-இல் இடத்தைப் பார்க்க | Button: "See the place on Google Maps". |
| [ ] | `details.calendar` | Add to calendar | நாட்காட்டியில் சேர்க்க | Button: "Add to calendar". |
| [ ] | `details.googleCal` | Or add to Google Calendar: | அல்லது Google Calendar-இல் சேர்க்க: | Small print above two Google Calendar links. |
| [ ] | `details.printable` | Printable invitation (PDF) | அச்சிடக்கூடிய அழைப்பிதழ் (PDF) | Link to the printable PDF. |
| [ ] | `details.signoff` | With love, Akash & Iswaryalakshmi | அன்புடன், ஆகாஷ் & ஐஸ்வர்யலட்சுமி |  |
| [ ] | `ui.skip` | Skip to details | முழு விவரங்கள் | Top-left button that jumps to the details. Kept short ("Full details") so it fits on one line. |
| [ ] | `ui.langSwitch` | தமிழ் | English | Shown on the Tamil page, switches back to English. |
| [ ] | `ui.langSwitchLabel` | தமிழில் படிக்க | Read in English |  |
| [ ] | `ui.musicPlay` | Play music | இசையை இயக்கு |  |
| [ ] | `ui.musicPause` | Pause music | இசையை நிறுத்து |  |
| [ ] | `calendar.reception` | Reception: Akash & Iswaryalakshmi | வரவேற்பு: ஆகாஷ் & ஐஸ்வர்யலட்சுமி |  |
| [ ] | `calendar.muhurtham` | Muhurtham: Akash & Iswaryalakshmi | முகூர்த்தம்: ஆகாஷ் & ஐஸ்வர்யலட்சுமி |  |
| [ ] | `calendar.timeTba` | Start time to be confirmed. | நேரம் பின்னர் உறுதிசெய்யப்படும். | Only used while the reception start time is a placeholder. |
| [ ] | `print.map` | Map | வரைபடம் | Label in the printable PDF. |
| [ ] | `time.morning` |  | காலை | Used before times 00:00-11:59, e.g. காலை 6:00. |
| [ ] | `time.noon` |  | மதியம் | Used for 12:00-15:59. |
| [ ] | `time.evening` |  | மாலை | Used for 16:00-19:59 (so a 7 PM reception reads மாலை 7:00). |
| [ ] | `time.night` |  | இரவு | Used for 20:00 onwards. The ranges live in `tamilPeriod` in src/lib/content.js. |

## Where each string appears

- **Page:** everything except `calendar.*` and `print.*`.
- **Printable PDF (page 2):** names, kicker, invite, event titles, dates, times, venue, `print.*`, sign-off. Run `npm run capture` after edits to regenerate it.
- **Calendar file (invite-ta.ics):** `calendar.*`, `venue`. Downloaded when a guest taps "Add to calendar" on the Tamil page.
