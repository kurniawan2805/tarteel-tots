const QURAN_TEXT_API = 'https://api.alquran.cloud/v1/ayah';

export async function fetchAyahText(surah, ayah) {
  try {
    const response = await fetch(`${QURAN_TEXT_API}/${surah}:${ayah}`);
    const data = await response.json();
    let text = data.data.text;
    
    return stripBismillah(text, surah, ayah);
  } catch (error) {
    console.error('Error fetching ayah text:', error);
    return null;
  }
}

function stripBismillah(text, surah, ayah) {
  // Strip Bismillah if it's prepended (standard in alquran.cloud for first ayahs)
  // But keep it if it's Surah 1, Ayah 1
  if (surah !== 1 && ayah === 1) {
    const bismillah = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
    // Using a regex to be more robust against slight variations in diacritics
    if (text.startsWith(bismillah)) {
      text = text.replace(bismillah, "").trim();
    } else if (text.includes("بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ")) {
      // Fallback for different diacritic styles
      text = text.replace("بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ", "").trim();
    }
  }
  return text;
}

export async function fetchSurahText(surah) {
  try {
    const response = await fetch(`https://api.alquran.cloud/v1/surah/${surah}`);
    const data = await response.json();
    return data.data.ayahs.map(ayah => ({
      ...ayah,
      text: stripBismillah(ayah.text, surah, ayah.numberInSurah)
    }));
  } catch (error) {
    console.error('Error fetching surah text:', error);
    return null;
  }
}

export async function fetchSurahMeta(surah) {
  try {
    const response = await fetch(`https://api.alquran.cloud/v1/surah/${surah}/metadata`);
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching surah meta:', error);
    return null;
  }
}
