import assert from "node:assert/strict";
import { test } from "node:test";

import { mimeFor, validateAudioFile } from "../../src/features/majliss/audio-validation.ts";

test("les vocaux WhatsApp OGG/OPUS et M4A sont acceptés", () => {
  for (const [name, type] of [
    ["vocal.ogg", "audio/ogg"],
    ["vocal.opus", "audio/opus"],
    ["vocal.m4a", "audio/mp4"],
  ]) {
    assert.doesNotThrow(() => validateAudioFile(new File(["audio"], name, { type })));
  }
});

test("cinq vocaux peuvent être préparés dans un même lot", () => {
  const files = Array.from(
    { length: 5 },
    (_, index) => new File([`audio-${index}`], `partie-${index + 1}.ogg`, { type: "audio/ogg" }),
  );
  assert.equal(
    files.filter((file) => {
      validateAudioFile(file);
      return true;
    }).length,
    5,
  );
});

test("une extension ou un MIME inattendu est refusé", () => {
  assert.throws(
    () => validateAudioFile(new File(["x"], "photo.jpg", { type: "image/jpeg" })),
    /format non pris en charge/,
  );
  assert.throws(
    () => validateAudioFile(new File(["x"], "faux.mp3", { type: "text/plain" })),
    /type audio non reconnu/,
  );
});

test("fichier vide et taille supérieure à 500 Mio sont refusés", () => {
  assert.throws(
    () => validateAudioFile({ name: "vide.mp3", type: "audio/mpeg", size: 0 }),
    /fichier vide/,
  );
  assert.throws(
    () => validateAudioFile({ name: "grand.mp3", type: "audio/mpeg", size: 500 * 1024 * 1024 + 1 }),
    /supérieur à 500 Mo/,
  );
});

test("le MIME des fichiers sans type navigateur est déterminé par extension", () => {
  assert.equal(mimeFor(new File(["x"], "vocal.m4a")), "audio/mp4");
  assert.equal(mimeFor(new File(["x"], "vocal.mp3")), "audio/mpeg");
});
