'use strict';
/** Domont-genre design tokens + stylesheets for the consulting-toolkit renderer.
 *  Two stylesheets: deckCss() for 1280×720 16:9 slides, docCss() for A4 handbook.
 *  Tokens are the single source — keep in sync with domont-deliverable-anatomy.md §1. */

const T = {
  navy: '#0A2156', navy2: '#13327A', cyan: '#00A0E3', gold: '#F2A900',
  green: '#2E9E5B', red: '#C0392B', amber: '#E8A33D',
  ink: '#1A1A1A', gray: '#6B6B6B', faint: '#9AA0AE',
  rule: '#0A2156', frule: '#D8D8D8', panel: '#F4F5F7', panel2: '#E8EDF5',
  font: "Arial, 'Helvetica Neue', Helvetica, 'Liberation Sans', sans-serif",
};

function quadColor(name) {
  return ({ navy: T.navy, gold: T.gold, green: T.green, red: T.red, amber: T.amber, cyan: T.cyan } )[name] || T.navy;
}

function deckCss() {
  return `
:root{--navy:${T.navy};--navy2:${T.navy2};--cyan:${T.cyan};--gold:${T.gold};--green:${T.green};--red:${T.red};--amber:${T.amber};--ink:${T.ink};--gray:${T.gray};--panel:${T.panel};--panel2:${T.panel2};--frule:${T.frule}}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:1280px 720px;margin:0}
html,body{font-family:${T.font};color:var(--ink);font-size:16px}
.slide{position:relative;width:1280px;height:720px;padding:48px 64px 64px;page-break-after:always;overflow:hidden;background:#fff;display:flex;flex-direction:column}
.slide:last-child{page-break-after:auto}
.slide.cover{display:block;padding:0}
/* header (natural height — 1 or 2 lines) */
.hd{flex:0 0 auto;margin-bottom:18px}
.hd .title{color:var(--navy);font-size:28px;font-weight:700;line-height:1.16;letter-spacing:-.2px}
.hd .sub{color:var(--gray);font-size:15px;margin-top:3px}
.hd .rule{height:3px;background:var(--navy);margin-top:12px}
/* footer */
.ft{position:absolute;left:64px;right:64px;bottom:26px}
.ft .frule{height:1px;background:var(--frule);margin-bottom:7px}
.ft .meta{display:flex;justify-content:space-between;font-size:11px;color:var(--faint)}
.src{position:absolute;left:64px;bottom:46px;font-size:10px;color:var(--faint)}
/* body flows after the header and fills the remaining height down to the footer */
.body{flex:1 1 auto;min-height:0;position:relative;overflow:hidden}
/* cover */
.cover{padding:0}
.cover .band{height:430px;background:var(--navy);position:relative;overflow:hidden}
.cover .band:after{content:"";position:absolute;inset:0;background:radial-gradient(1200px 400px at 80% -10%,rgba(0,160,227,.45),transparent 60%)}
.cover .kicker{position:absolute;top:46px;left:64px;color:var(--cyan);font-size:15px;letter-spacing:3px;text-transform:uppercase;font-weight:700}
.cover .ttl{position:absolute;bottom:54px;left:64px;right:64px;color:#fff;font-size:52px;font-weight:800;line-height:1.05;letter-spacing:-.5px}
.cover .meta{padding:34px 64px}
.cover .meta .st{color:var(--cyan);font-size:22px;font-weight:700}
.cover .meta .brand{color:var(--gray);font-size:14px;margin-top:8px}
.cover .meta .brand b{color:var(--navy)}
/* generic blocks */
ul.b{list-style:none}
ul.b>li{position:relative;padding-left:19px;margin-bottom:8px;font-size:15.5px;line-height:1.38}
ul.b>li:before{content:"";position:absolute;left:0;top:8px;width:6px;height:6px;background:var(--cyan)}
ul.b ul{list-style:none;margin-top:5px}
ul.b ul>li{position:relative;padding-left:18px;margin:4px 0;font-size:14px;color:#33384a}
ul.b ul>li:before{content:"–";position:absolute;left:2px;color:var(--gray)}
.lead{font-size:16px;line-height:1.5;color:#22273a;margin-bottom:10px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:34px;height:100%}
.sub-h{color:var(--navy);font-size:16px;font-weight:700;border-bottom:1px solid var(--frule);padding-bottom:5px;margin:14px 0 9px}
.sub-h:first-child{margin-top:0}
.panel{background:var(--panel);padding:18px 20px}
.panel2{background:var(--panel2)}
/* process-map chevrons */
.chev{display:flex;gap:6px;align-items:stretch;height:100%}
.chev .ph{flex:1;display:flex;flex-direction:column;min-width:0}
.chev .cap{position:relative;background:var(--navy);color:#fff;padding:14px 16px 14px 30px;min-height:78px;display:flex;flex-direction:column;justify-content:center;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 50%,calc(100% - 16px) 100%,0 100%,16px 50%)}
.chev .ph:first-child .cap{clip-path:polygon(0 0,calc(100% - 16px) 0,100% 50%,calc(100% - 16px) 100%,0 100%)}
.chev .cap .n{font-size:13px;opacity:.7;font-weight:700}
.chev .cap .nm{font-size:14.5px;font-weight:700;line-height:1.15;margin-top:2px}
.chev .ph.active .cap{background:var(--cyan)}
.chev .bul{padding:14px 8px 0 12px}
.chev .bul li{font-size:12.5px;line-height:1.3;margin-bottom:7px;list-style:none;position:relative;padding-left:12px;color:#2a2f40}
.chev .bul li:before{content:"";position:absolute;left:0;top:6px;width:5px;height:5px;background:var(--cyan)}
.chev .bul .grp{font-weight:700;color:var(--navy);margin:9px 0 4px;padding-left:0;font-size:12.5px}
.chev .bul .grp:before{display:none}
/* section divider */
.section .prog{display:flex;gap:6px;margin-bottom:40px}
.section .prog .c{flex:1;background:#E3E6ED;color:#8a90a0;padding:11px 14px 11px 26px;font-size:12.5px;font-weight:700;clip-path:polygon(0 0,calc(100% - 14px) 0,100% 50%,calc(100% - 14px) 100%,0 100%,14px 50%);line-height:1.1}
.section .prog .c:first-child{clip-path:polygon(0 0,calc(100% - 14px) 0,100% 50%,calc(100% - 14px) 100%,0 100%)}
.section .prog .c.on{background:var(--navy);color:#fff}
.section .big{display:flex;align-items:baseline;gap:24px;margin-top:30px}
.section .big .num{font-size:120px;font-weight:800;color:var(--cyan);line-height:.8}
.section .big .nm{font-size:38px;font-weight:800;color:var(--navy);line-height:1.05}
.section .goal{font-size:19px;color:#33384a;margin-top:26px;max-width:840px;line-height:1.5}
/* exec summary pyramid */
.exec .gov{background:var(--navy);color:#fff;padding:22px 26px;font-size:21px;font-weight:700;line-height:1.35;margin-bottom:22px}
.exec .reasons{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:16px}
.exec .reasons .r{background:var(--panel);border-top:4px solid var(--cyan);padding:16px 16px}
.exec .reasons .r .rt{color:var(--navy);font-weight:700;font-size:15.5px;margin-bottom:8px;line-height:1.2}
.exec .reasons .r .rb{font-size:13.5px;line-height:1.4;color:#33384a}
/* matrix 2x2 */
.quadwrap{display:grid;grid-template-columns:34px 1fr;grid-template-rows:1fr 34px;height:100%;gap:10px}
.ylab{writing-mode:vertical-rl;transform:rotate(180deg);text-align:center;font-weight:700;color:var(--navy);font-size:15px;align-self:center}
.quad{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:12px}
.quad .q{padding:18px 20px;color:#fff;position:relative}
.quad .q .ql{font-size:19px;font-weight:800;margin-bottom:8px}
.quad .q .qd{font-size:13.5px;line-height:1.35;opacity:.96}
.quad .q .qs{font-size:13px;margin-top:8px;font-weight:700}
.xlab{grid-column:2;text-align:center;font-weight:700;color:var(--navy);font-size:15px}
.axhint{position:absolute;font-size:11px;color:var(--gray)}
/* staircase */
.stair{display:flex;align-items:flex-end;height:100%;gap:0;padding-bottom:10px}
.stair .st{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;position:relative}
.stair .st .box{background:var(--panel);border-bottom:4px solid var(--cyan);padding:12px 10px;width:100%;text-align:center}
.stair .st .n{width:30px;height:30px;border-radius:50%;background:var(--cyan);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;margin:0 auto 8px}
.stair .st .lb{font-size:12.5px;font-weight:700;color:var(--navy);line-height:1.2}
.stair .st .ds{font-size:11px;color:#444;margin-top:5px;line-height:1.25}
/* process flow */
.flow{display:flex;align-items:center;gap:0;height:100%;justify-content:center;flex-wrap:wrap}
.flow .fb{background:var(--navy);color:#fff;padding:20px 16px;min-width:150px;text-align:center;font-weight:700;font-size:15px;line-height:1.2}
.flow .fb .fs{font-weight:400;font-size:12.5px;opacity:.85;margin-top:6px}
.flow .ar{color:var(--cyan);font-size:30px;padding:0 8px}
.flow .note{flex-basis:100%;text-align:center;color:var(--gray);font-size:13px;margin-top:18px}
/* tutorial */
.tut{display:flex;flex-direction:column;gap:13px;height:100%;justify-content:center}
.tut .ts{display:flex;gap:16px;align-items:flex-start}
.tut .ts .n{flex:0 0 34px;width:34px;height:34px;border-radius:50%;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px}
.tut .ts .c .tt{font-weight:700;color:var(--navy);font-size:16px}
.tut .ts .c .td{font-size:14px;color:#33384a;line-height:1.4;margin-top:3px}
/* tables */
table.t{width:100%;border-collapse:collapse;font-size:13.5px}
table.t th{background:var(--navy);color:#fff;text-align:left;padding:9px 12px;font-weight:700}
table.t td{padding:8px 12px;border-bottom:1px solid #E6E8EE;vertical-align:top;line-height:1.35}
table.t tr:nth-child(even) td{background:#FAFBFC}
table.t td.fh{font-weight:700;color:var(--navy);background:var(--panel)}
table.t.t-mid th,table.t.t-mid td{padding:6px 12px;font-size:12.5px}
table.t.t-dense th,table.t.t-dense td{padding:4px 12px;font-size:11.5px;line-height:1.25}
/* comparison */
.cmp{display:grid;gap:14px;height:100%;align-content:start}
.cmp .row{display:grid;gap:14px}
.cmp .col-h{padding:12px;color:#fff;font-weight:800;font-size:17px;text-align:center}
.cmp .cell{padding:11px 14px;font-size:14px;line-height:1.35;text-align:center}
/* kpi tiles */
.tiles{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:18px;height:100%;align-items:center}
.tiles .tile{background:var(--panel);padding:26px 18px;text-align:center;border-bottom:5px solid var(--cyan)}
.tiles .tile .v{font-size:46px;font-weight:800;color:var(--navy);line-height:1}
.tiles .tile .l{font-size:14px;color:#33384a;margin-top:10px;line-height:1.3}
/* example */
.ex{display:grid;grid-template-columns:1fr 320px;gap:28px;height:100%}
.ex .co{font-size:24px;font-weight:800;color:var(--navy);margin-bottom:12px}
.ex .nr{font-size:15.5px;line-height:1.5;color:#22273a}
.ex .data{background:var(--panel);padding:18px}
.ex .data .d{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #E2E5EC;font-size:14px}
.ex .data .d .dv{font-weight:800;color:var(--navy)}
/* quote */
.quote{display:flex;align-items:center;height:100%}
.quote .qt{font-size:34px;font-weight:700;color:var(--navy);line-height:1.3;border-left:6px solid var(--cyan);padding-left:28px}
.quote .at{font-size:16px;color:var(--gray);margin-top:16px;font-weight:400}
/* close */
.close .msg{font-size:26px;font-weight:800;color:var(--navy);line-height:1.3;max-width:900px}
.close ul.b{margin-top:24px}
.close ul.b>li{font-size:18px}
/* charts */
.chart-wrap{display:grid;grid-template-columns:1fr 280px;gap:28px;height:100%;align-items:center}
.chart-wrap.nokey{grid-template-columns:1fr}
.chart-wrap .cc{height:470px;display:flex;align-items:center}
.chart-wrap .cc svg{width:100%;height:100%}
.chart-key .kt{color:var(--navy);font-weight:700;font-size:15px;border-bottom:1px solid var(--frule);padding-bottom:6px;margin-bottom:10px}
.chart-key li{font-size:13.5px;line-height:1.4;margin-bottom:9px;list-style:none;position:relative;padding-left:14px}
.chart-key li:before{content:"";position:absolute;left:0;top:6px;width:6px;height:6px;background:var(--cyan)}
.htmlbody{font-size:15px;line-height:1.5}
`;
}

function docCss() {
  return `
:root{--navy:${T.navy};--cyan:${T.cyan};--gold:${T.gold};--green:${T.green};--red:${T.red};--ink:${T.ink};--gray:${T.gray};--panel:${T.panel};--panel2:${T.panel2}}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:A4;margin:20mm 18mm 22mm;
  @bottom-center{content:counter(page);color:#9aa0ae;font-size:9pt}
  @bottom-left{content:"Ritsu Works · Consulting Toolkit";color:#9aa0ae;font-size:8pt}}
@page:first{margin:0}
html{font-family:${T.font};color:var(--ink);font-size:10.6pt;line-height:1.5}
body{margin:0}
.cover{page-break-after:always;height:297mm;position:relative;color:#fff;background:var(--navy)}
.cover:after{content:"";position:absolute;inset:0;background:radial-gradient(700px 300px at 85% 12%,rgba(0,160,227,.5),transparent 60%)}
.cover .k{position:absolute;top:46mm;left:22mm;color:var(--cyan);letter-spacing:4px;text-transform:uppercase;font-size:12pt;font-weight:700;z-index:1}
.cover h1{position:absolute;top:62mm;left:22mm;right:22mm;font-size:34pt;font-weight:800;line-height:1.08;z-index:1}
.cover .ol{position:absolute;top:118mm;left:22mm;right:30mm;font-size:14pt;font-weight:400;color:#cfe2ff;line-height:1.45;z-index:1}
.cover .br{position:absolute;bottom:30mm;left:22mm;color:#9fb4dd;font-size:11pt;z-index:1}
main{padding:0}
h1{color:var(--navy);font-size:21pt;font-weight:800;margin:26px 0 6px;line-height:1.15}
h2{color:var(--navy);font-size:15.5pt;font-weight:800;margin:24px 0 8px;padding-bottom:6px;border-bottom:2px solid var(--navy);line-height:1.2;page-break-after:avoid}
h3{color:#13327A;font-size:12.5pt;font-weight:700;margin:16px 0 5px;page-break-after:avoid}
h4{color:var(--navy);font-size:11pt;font-weight:700;margin:12px 0 3px}
p{margin:0 0 9px}
ul,ol{margin:0 0 10px;padding-left:20px}
li{margin:3px 0}
strong{color:#101428}
code{background:var(--panel);padding:1px 5px;border-radius:3px;font-family:ui-monospace,Menlo,monospace;font-size:9.2pt}
blockquote{margin:10px 0;padding:8px 16px;border-left:4px solid var(--cyan);background:var(--panel);color:#2a2f40}
hr{border:none;border-top:1px solid #dfe2ea;margin:18px 0}
a{color:#0E63C7;text-decoration:none}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:9.4pt;page-break-inside:avoid}
th{background:var(--navy);color:#fff;text-align:left;padding:6px 9px;font-weight:700}
td{padding:5px 9px;border-bottom:1px solid #E6E8EE;vertical-align:top;line-height:1.35}
tr:nth-child(even) td{background:#FAFBFC}
.toc{page-break-after:always}
.toc h2{border-bottom:2px solid var(--navy)}
.toc ol{font-size:11pt;line-height:1.9;list-style:decimal}
`;
}

module.exports = { T, deckCss, docCss, quadColor };
