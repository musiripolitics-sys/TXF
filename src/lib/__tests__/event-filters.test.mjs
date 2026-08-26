import { whenRange, matches, applyFilters, fromParams, toParams, EMPTY, bestRecovery } from "../../../.tmp/event-filters.mjs";
let pass=0, fail=0;
const ok=(c,m)=>{c?(pass++,console.log("  ✅ "+m)):(fail++,console.log("  ❌ "+m));};
const ev=(o)=>({slug:o.slug??"s",title:o.title??"T",category:o.category??"Meetup",date:o.date,
  dateLabel:"",time:"",city:o.city??"Chennai",venue:o.venue??"V",address:"",price:o.price??"Free",
  priceLabel:"",blurb:"",about:"",spotsLeft:5,capacity:10,speakers:[],tags:o.tags});
const d=(s)=>s; // ISO date strings

console.log("Date windows (reference: Wed 26 Aug 2026):");
const now = new Date(2026,7,26); // Wed
let [s,e] = whenRange("today", now);
ok(s.getDate()===26 && e.getDate()===27, "today = the 26th only");
[s,e] = whenRange("weekend", now);
ok(s.getDate()===29 && s.getDay()===6, "weekend starts on the coming Saturday (29th)");
ok(e.getDate()===31, "and ends after Sunday");
[s,e] = whenRange("month", now);
ok(Math.round((e-s)/864e5)===30, "next 30 days spans 30 days");

console.log("\nWeekend when you're already in one:");
const sat = new Date(2026,7,29); // Saturday
[s,e] = whenRange("weekend", sat);
ok(s.getDate()===29, "on Saturday, the weekend starts today");
const sun = new Date(2026,7,30); // Sunday
[s,e] = whenRange("weekend", sun);
ok(s.getDate()===30 && e.getDate()===30+1, "on Sunday, it's just today — not next weekend");

console.log("\nFiltering:");
const events=[
  ev({slug:"a",date:"2026-08-26",city:"Chennai",category:"Meetup",price:"Free",tags:["react"]}),
  ev({slug:"b",date:"2026-08-29",city:"Online", category:"Workshop",price:"Paid",tags:["react","beginner"]}),
  ev({slug:"c",date:"2026-12-01",city:"Bengaluru",category:"Meetup",price:"Paid"}),
];
const f=(o)=>({...EMPTY,...o});
ok(applyFilters(events,f({when:"today"}),now).length===1, "when=today returns 1");
ok(applyFilters(events,f({when:"weekend"}),now).map(x=>x.slug).join()==="b", "weekend returns the Saturday event");
ok(applyFilters(events,f({format:"online"}),now).map(x=>x.slug).join()==="b", "format=online isolates the online event");
ok(applyFilters(events,f({format:"inperson"}),now).map(x=>x.slug).sort().join()==="a,c", "in-person excludes it");
ok(applyFilters(events,f({tags:["react"]}),now).length===2, "tag filter matches 2");
ok(applyFilters(events,f({tags:["react","beginner"]}),now).length===1, "multiple tags are ANDed");
ok(applyFilters(events,f({q:"beginner"}),now).length===1, "search also looks in tags");

console.log("\nFacet counts skip their own dimension:");
const fc=f({city:"Chennai",category:undefined});
ok(events.filter(x=>matches(x,f({city:"Chennai"}),"city",now)).length===3,
   "counting the city facet ignores the city filter");
ok(events.filter(x=>matches(x,f({city:"Chennai",price:"Paid"}),"city",now)).length===2,
   "but still respects the other filters");

console.log("\nRecovery:");
const dead=f({city:"Chennai",when:"weekend"});
ok(applyFilters(events,dead,now).length===0, "Chennai + this weekend is a dead end");
const rec=bestRecovery(events,dead,now);
ok(rec && rec.count>0, "a recovery is offered");
ok(rec.dimension==="city"||rec.dimension==="when", `it drops one filter (${rec?.dimension})`);

console.log("\nURL round-trip:");
const orig=f({q:"react",cats:["Meetup"],city:"Chennai",price:"Paid",when:"weekend",format:"online",tags:["a","b"],sort:"free"});
const back=fromParams(new URLSearchParams(toParams(orig).toString()));
ok(JSON.stringify(back)===JSON.stringify(orig), "filters survive a round-trip through the URL");
ok(toParams(EMPTY).toString()==="", "a clean view produces a clean URL");
ok(fromParams(new URLSearchParams("category=Bogus&price=x&when=y")).cats.length===0, "junk params are ignored");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
