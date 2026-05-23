// Registry of bundled "factory default" pages. Used to seed R2 on first
// read for a brand-new deployment. The admin writes edits directly to R2
// and does NOT update this file; once R2 has content for a given key,
// the seed here is ignored.
//
// If you want to ship a new built-in default page with the template, add
// the JSON under content/pages/... and register it below.
/* eslint-disable */
import p0 from './pages/g/en/sample-runner.json';
import p1 from './pages/g/zh/sample-runner.json';
import p2 from './pages/home/en.json';
import p3 from './pages/home/zh.json';
import p4 from './pages/p/en/getting-started.json';
import p5 from './pages/t/en/action.json';

const files: Record<string, unknown> = {
  "game/en/sample-runner": p0,
  "game/zh/sample-runner": p1,
  "home/en/home": p2,
  "home/zh/home": p3,
  "guide/en/getting-started": p4,
  "tag/en/action": p5,
};

export default files;
