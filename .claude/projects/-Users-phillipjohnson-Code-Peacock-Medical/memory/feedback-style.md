---
name: feedback-style
description: Feedback on response style and working approach confirmed or corrected by Phil
metadata:
  type: feedback
---

When SonarQube / SonarCloud findings are presented: assess each one individually — some may already be fixed in a prior commit. Say so explicitly rather than making a redundant second change.

**Why:** Phil's "or tell me why it's OK" phrasing was deliberately designed to get assessment, not execution. Getting this right produced a correct non-fix in the Phase 3 SonarCloud session and was cited as a key steering example in docs/11.

**How to apply:** For any batch of external tool findings, lead with a brief assessment of each before touching code. Flag already-fixed items as "will auto-close on next scan".
