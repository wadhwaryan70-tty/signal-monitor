import { fetchCompanyNews } from "../lib/news.ts";
for (const n of process.argv.slice(2)) { const r = await fetchCompanyNews(n, null); console.log(`== ${n}`); r.forEach((x) => console.log(x.published_at?.slice(0, 10), x.title.slice(0, 110), "|", x.source)); }
