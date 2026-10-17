// 拉 GoatCounter API + 读 data/*.json → 生成 public/（静态看板 + stats.json）
// 只输出聚合数字；token 只从环境变量读取，不写入任何文件。
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = process.env.OUT_DIR || path.join(ROOT, 'public');
const SITE = process.env.GC_SITE || 'xhstitle';
const API = process.env.GC_API || `https://${SITE}.goatcounter.com/api/v0`;
const TOKEN = process.env.GOATCOUNTER_TOKEN || '';
const TZ_OFFSET_H = 8; // 北京时间
const NOW = process.env.NOW ? new Date(process.env.NOW) : new Date();

// ---------- 时间工具（北京时间日界线，API 要求整点） ----------
const bjDate = d => new Date(d.getTime() + TZ_OFFSET_H * 3600e3).toISOString().slice(0, 10);
const bjMidnightUTC = ymd => new Date(Date.parse(ymd + 'T00:00:00Z') - TZ_OFFSET_H * 3600e3);
const addDays = (d, n) => new Date(d.getTime() + n * 86400e3);
const iso = d => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
const ceilHour = d => new Date(Math.ceil(d.getTime() / 3600e3) * 3600e3);
const fmtBJ = d => new Date(d.getTime() + TZ_OFFSET_H * 3600e3).toISOString().slice(0, 16).replace('T', ' ') + ' 北京时间';

async function gc(p, params) {
  const u = new URL(API + p);
  for (const [k, v] of Object.entries(params || {})) u.searchParams.set(k, v);
  for (let i = 0; i < 3; i++) {
    const r = await fetch(u, { headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' } });
    if (r.status === 429) { await new Promise(s => setTimeout(s, 1500)); continue; }
    if (!r.ok) throw new Error(`GoatCounter ${p} HTTP ${r.status}`);
    return r.json();
  }
  throw new Error(`GoatCounter ${p} rate limited`);
}

// 一个时间段的工具侧数据（GoatCounter 的 count 均为"访客"口径：同一会话内同一路径/事件只算 1）
async function period(start, end) {
  const q = { start: iso(start), end: iso(end) };
  const hits = await gc('/stats/hits', { ...q, limit: 100 });
  const ev = {}; let pageVisitors = 0;
  for (const h of hits.hits || []) {
    if (h.event) ev[h.path] = (ev[h.path] || 0) + (h.count || 0);
    else pageVisitors += h.count || 0;
  }
  let refs = [];
  try { refs = ((await gc('/stats/toprefs', { ...q, limit: 20 })).stats || []).map(s => ({ name: s.name || '（直接访问/无来源）', count: s.count })); } catch (e) { refs = null; }
  return { pageVisitors, ev, refs };
}

const rate = (a, b) => (b > 0 && a != null ? Math.round((a / b) * 1000) / 10 : null); // 百分比，一位小数
const n0 = v => (v == null ? null : v);

function toolMetrics(p) {
  if (!p) return null;
  const e = k => p.ev[k] || 0;
  const V = p.pageVisitors;
  const src = Object.entries(p.ev).filter(([k, v]) => k.startsWith('src-') && v > 0).map(([k, v]) => ({ name: k.slice(4), count: v })).sort((a, b) => b.count - a.count);
  const env = ['wechat', 'qq', 'other'].map(k => ({ name: { wechat: '微信内', qq: 'QQ 内', other: '其他浏览器' }[k], count: e('env-' + k) })).filter(x => x.count > 0);
  const copyMax = Math.max(e('copy-title'), e('copy-body'));
  return {
    visitors: V,
    generate: e('generate'),
    generate_rate: rate(e('generate'), V),
    copy_title: e('copy-title'),
    copy_body: e('copy-body'),
    copy_rate_min: rate(copyMax, V),
    copy_fail: e('copy-fail') || null,
    engaged_30s_rate: rate(e('engaged-30s'), V),
    bounce_approx: V > 0 ? Math.round((1 - Math.min(e('generate'), V) / V) * 1000) / 10 : null,
    returning_rate: rate(e('returning'), V),
    share_click: e('share-click'),
    share_native_ok: e('share-native-ok') || null,
    share_copylink: e('share-copylink') || null,
    share_visitors: e('ref-share'),
    k_factor: rate(e('ref-share'), V),
    email_submit: e('email-submit') || null,
    sources: src,
    referrers: p.refs ? p.refs.filter(r => r.count > 0) : null,
    env,
  };
}

function readJSON(f) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch (e) { return null; }
}

async function main() {
  const today = bjDate(NOW);
  const yday = bjDate(addDays(NOW, -1));
  const dow = (new Date(Date.parse(today + 'T00:00:00Z')).getUTCDay() + 6) % 7; // 周一=0
  const weekStart = bjMidnightUTC(bjDate(addDays(NOW, -dow)));
  const t0 = bjMidnightUTC(today), y0 = bjMidnightUTC(yday);
  const endNow = ceilHour(NOW);

  const out = { generated_at: NOW.toISOString(), generated_at_bj: fmtBJ(NOW), tool: null, tool_error: null, x: null, xhs: null };
  if (TOKEN) {
    try {
      const [pt, py, pw] = [await period(t0, endNow), await period(y0, t0), await period(weekStart, endNow)];
      out.tool = { updated_at_bj: fmtBJ(NOW), freq: '约每 15 分钟（GitHub Actions 定时任务，常有几分钟延迟）', today: toolMetrics(pt), yesterday: toolMetrics(py), week: toolMetrics(pw), date: today, week_start: bjDate(weekStart) };
    } catch (e) { out.tool_error = String(e.message || e).replace(TOKEN, '***'); }
  } else out.tool_error = '未配置 GOATCOUNTER_TOKEN';

  out.x = readJSON('data/x.json');
  out.xhs = readJSON('data/xhs.json');

  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(path.join(ROOT, 'site'))) fs.copyFileSync(path.join(ROOT, 'site', f), path.join(OUT, f));
  const json = JSON.stringify(out, null, 1);
  if (TOKEN && json.includes(TOKEN)) throw new Error('token leaked into output, abort');
  fs.writeFileSync(path.join(OUT, 'stats.json'), json);
  if (process.env.SNAPSHOT) writeSnapshot(out, path.join(ROOT, 'snapshots'));
  console.log('built', OUT, out.tool_error ? 'tool_error=' + out.tool_error : 'tool ok');
}

// 每日快照（前一天），给 Bagel 审
function writeSnapshot(out, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const t = out.tool, y = t && t.yesterday, w = t && t.week;
  const date = t ? bjDate(addDays(new Date(Date.parse(t.date + 'T12:00:00Z')), -1)) : bjDate(addDays(NOW, -1));
  const L = [`# xhs-title 日报快照 · ${date}`, '', `生成于 ${out.generated_at_bj}。工具侧数据来自 GoatCounter，口径为"访客"（同一会话内同一事件只算 1 次）。`, ''];
  if (y) {
    const row = (k, a, b) => (a == null ? null : `| ${k} | ${a} | ${b == null ? '' : b} |`);
    L.push('| 指标 | 昨日 | 本周累计 |', '|---|---|---|');
    [row('访客', y.visitors, w && w.visitors), row('生成人数', y.generate, w && w.generate), row('生成率 %', y.generate_rate, w && w.generate_rate),
     row('复制标题人数', y.copy_title, w && w.copy_title), row('复制正文人数', y.copy_body, w && w.copy_body), row('复制率 %（下限）', y.copy_rate_min, w && w.copy_rate_min),
     row('停留≥30秒 %', y.engaged_30s_rate, w && w.engaged_30s_rate), row('近似跳出率 %', y.bounce_approx, w && w.bounce_approx), row('回访占比 %', y.returning_rate, w && w.returning_rate),
     row('分享点击人数', y.share_click, w && w.share_click), row('分享链接来访', y.share_visitors, w && w.share_visitors), row('传播系数 %', y.k_factor, w && w.k_factor), row('登记邮箱', y.email_submit, w && w.email_submit)]
      .filter(Boolean).forEach(r => L.push(r));
    if (y.sources.length) L.push('', '来源（src）：' + y.sources.map(s => `${s.name} ${s.count}`).join(' · '));
  } else L.push('工具侧：' + (out.tool_error || '无数据'));
  L.push('', 'X / 小红书：见看板（人工或定时录入，附更新时间）。');
  fs.writeFileSync(path.join(dir, date + '.md'), L.join('\n') + '\n');
  fs.writeFileSync(path.join(dir, date + '.json'), JSON.stringify({ date, tool: y || null, week: w || null, x: out.x, xhs: out.xhs }, null, 1));
}

main().catch(e => { console.error(String(e.message || e).replace(TOKEN || '\u0000', '***')); process.exit(1); });
