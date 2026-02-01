const fs = require("fs");

const src = "./baza.db";
const dest = "./backup_" + Date.now() + ".db";

if (!fs.existsSync(src)) {
  console.log("Baza ne postoji još.");
  process.exit(0);
}

fs.copyFileSync(src, dest);

console.log("Backup napravljen:", dest);
