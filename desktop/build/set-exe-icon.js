// electron-builder afterPack hook: embed the WeekFlow icon and version info
// into WeekFlow.exe with resedit (pure JavaScript, so no Wine is needed).
const fs = require("fs");
const path = require("path");

module.exports = async function (context) {
  if (context.electronPlatformName !== "win32") return;
  const ResEdit = await import("resedit");
  const { NtExecutable, NtExecutableResource, Resource, Data } = ResEdit.default || ResEdit;
  const name = context.packager.appInfo.productFilename;
  const version = context.packager.appInfo.version;
  const exePath = path.join(context.appOutDir, name + ".exe");

  const exe = NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
  const res = NtExecutableResource.from(exe);

  const iconFile = Data.IconFile.from(fs.readFileSync(path.join(__dirname, "icon.ico")));
  const groups = Resource.IconGroupEntry.fromEntries(res.entries);
  const groupId = groups.length ? groups[0].id : 1;
  const lang = groups.length ? groups[0].lang : 1033;
  Resource.IconGroupEntry.replaceIconsForResource(res.entries, groupId, lang, iconFile.icons.map((i) => i.data));

  const viList = Resource.VersionInfo.fromEntries(res.entries);
  const vi = viList.length ? viList[0] : Resource.VersionInfo.createEmpty();
  const [a, b, c] = version.split(".").map(Number);
  vi.setFileVersion(a, b, c, 0, 1033);
  vi.setProductVersion(a, b, c, 0, 1033);
  vi.setStringValues({ lang: 1033, codepage: 1200 }, {
    FileDescription: "WeekFlow",
    ProductName: "WeekFlow",
    CompanyName: "WeekFlow",
    LegalCopyright: "Copyright © 2026 WeekFlow",
    OriginalFilename: name + ".exe",
    InternalName: "WeekFlow",
    FileVersion: version,
    ProductVersion: version
  });
  vi.outputToResourceEntries(res.entries);

  res.outputResource(exe);
  fs.writeFileSync(exePath, Buffer.from(exe.generate()));
  console.log("  • embedded icon and version info in", exePath);
};
