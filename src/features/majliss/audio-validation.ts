const ACCEPTED_EXTENSIONS = ["opus", "ogg", "m4a", "mp3", "aac", "wav"];
const ACCEPTED_MIMES = new Set([
  "audio/opus",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/mpeg",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
]);

function extensionOf(name: string) {
  return name.toLowerCase().split(".").pop() ?? "";
}

export function validateAudioFile(file: File) {
  if (!ACCEPTED_EXTENSIONS.includes(extensionOf(file.name))) {
    throw new Error(`${file.name} : format non pris en charge.`);
  }
  if (file.type && !ACCEPTED_MIMES.has(file.type)) {
    throw new Error(`${file.name} : type audio non reconnu (${file.type}).`);
  }
  if (file.size <= 0 || file.size > 500 * 1024 * 1024) {
    throw new Error(`${file.name} : fichier vide ou supérieur à 500 Mo.`);
  }
}

export function mimeFor(file: File) {
  if (file.type) return file.type;
  const ext = extensionOf(file.name);
  return ext === "mp3" ? "audio/mpeg" : ext === "m4a" ? "audio/mp4" : `audio/${ext}`;
}
