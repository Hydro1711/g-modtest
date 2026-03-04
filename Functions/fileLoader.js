import { glob } from "glob";
import { pathToFileURL } from "url";

/**
 * Returns an array of file:// URLs so dynamic import() works reliably on Render/Windows/Linux.
 */
export async function loadFiles(dirName) {
  const files = await glob(
    `${process.cwd().replace(/\\/g, "/")}/${dirName}/**/*.js`
  );

  // Convert to file URLs for import()
  return files.map((f) => pathToFileURL(f).href);
}
