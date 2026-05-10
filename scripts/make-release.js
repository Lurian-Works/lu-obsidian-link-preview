const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const pluginId = "lu-obsidian-link-preview-v0_1_0";

const distDir = path.join(__dirname, "..", "dist", pluginId);
const zipPath = path.join(__dirname, "..", "dist", `${pluginId}.zip`);

fs.rmSync(path.join(__dirname, "..", "dist"), {
  recursive: true,
  force: true,
});

fs.mkdirSync(distDir, { recursive: true });

const files = ["main.js", "manifest.json", "styles.css", "README.md"];

for (const file of files) {
  if (fs.existsSync(path.join(__dirname, "..", file))) {
    fs.copyFileSync(
      path.join(__dirname, "..", file),
      path.join(distDir, file)
    );
  }
}

execSync(`powershell Compress-Archive -Path "dist/${pluginId}" -DestinationPath "dist/${pluginId}.zip"`, {
  stdio: "inherit",
});

console.log(`Created ${zipPath}`);