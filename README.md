# Plan treningowy

Plan A/B pod koszykówkę w telefonie: co dziś robisz, ile serii i powtórzeń,
ostatni i rekordowy ciężar przy każdym ćwiczeniu, czas i całkowity ciężar po
treningu, rekordy od początku i biblioteka skoków z animacjami.

Treningi są ustawione na **czwartek i sobotę**, A i B idą na zmianę — jak jeden
wypadnie, następny i tak będzie tym, którego zabrakło.

**Trening C — extra, opcjonalny:** uruchamiasz go z karty na ekranie Dziś albo
z zakładki C w Planie, kiedy masz czas. Nie zmienia kolejności A/B ani ich
terminów. Push press 3×3–5, bench press 2×5–6, wiosłowanie z podparciem klatki
2×8–10, lat pulldown 2×8–10, face pull 2×12–15, Pallof press 2×10 na stronę.
Ciężary, historia, rekordy i kopia zapasowa działają tak samo jak przy A/B.
W Pallof press wpisujesz powtórzenia na jedną stronę; sumy obejmują obie.

Sprawdzenie rotacji A/B, kalendarza i danych treningu C: `npm run check:extra`.

**Aplikacja stoi tutaj: https://danie11o.github.io/plan-treningowy/**

## Na telefon (Android)

1. Otwórz ten adres w **Chrome** na telefonie.
2. Menu **⋮** → **Zainstaluj aplikację** (albo „Dodaj do ekranu głównego").
3. Ikona **AB** ląduje na ekranie głównym i w szufladzie aplikacji. Działa na pełnym
   ekranie i bez internetu.

Każdy `git push` na gałąź `main` publikuje nową wersję (workflow w
`.github/workflows/deploy.yml`). Telefon pobierze ją sam przy następnym
uruchomieniu — historia treningów zostaje.

## Twoje dane

- Wszystko zapisuje się od razu w pamięci telefonu, przy każdej wpisanej cyfrze.
  Zamknięcie aplikacji w połowie treningu niczego nie gubi.
- Aplikacja niczego nie wysyła, nie ma kont, reklam ani śledzenia.
- **Wyczyszczenie danych Chrome albo zmiana telefonu kasuje historię.** Dlatego
  w **Profil → Kopia zapasowa** jest „Wyślij kopię" (np. na Dysk Google) i
  „Wczytaj kopię z pliku". Wczytanie tylko dopisuje brakujące treningi, nigdy
  niczego nie usuwa. Warto zrobić kopię raz w miesiącu.
- Repozytorium jest publiczne, bo darmowy GitHub inaczej nie publikuje strony.
  Jest w nim sam kod — twoje treningi są tylko w telefonie.

## Jak zmienić plan

- **W aplikacji:** Plan → przy ćwiczeniu „Zmień serie, powtórzenia albo ciężar".
  Zmiana działa od następnego treningu i przechodzi razem z kopią zapasową.
- **Na stałe w kodzie:** `src/data/plan.ts` — plan z pliku `plan_treningowy_AB.txt`,
  zasady i propozycja rozgrzewki.
- Warianty skoków (opisy i animacje): `src/data/jumps.ts`.
  Podgląd klatek animacji: `npm run jumps` (plik `jump-sheet.png`).

## Uruchomienie na komputerze

Node jest zainstalowany, ale nie ma go w PATH, więc przed komendą trzeba go dołożyć:

```bash
$env:Path = "C:\Program Files\nodejs;" + $env:Path; npm run dev
```

Adres z linii `Network:` otworzysz też na telefonie w tej samej sieci Wi-Fi — do
testów. Do codziennego używania instaluj ze strony na GitHub Pages, bo tylko tam
działa instalacja i tryb offline.

Ikony: `npm run icons` (skrypt `scripts/generate-icons.mjs`).

## Jak to jest poukładane

```
src/
  data/plan.ts          plan A i B, zasady, rozgrzewka
  data/jumps.ts         14 wariantów skoków: opisy i pozy do animacji
  store/store.ts        zapis w telefonie: historia i trening w toku
  lib/stats.ts          sumy, rekordy, „ostatnio", podpowiedzi ciężaru
  lib/schedule.ts       czwartek i sobota, A i B na zmianę
  lib/backup.ts         kopia zapasowa do pliku
  lib/jumpMotion.ts     obliczenia animacji skoku
  components/           przyciski, arkusze, sylwetka skoku
  screens/              Dziś, Plan, Trening, Podsumowanie, Historia, Profil, Rekordy, Skoki
```

Kilka decyzji wartych znania:

- **Trening trzyma kopię planu z tamtego dnia** — zmiana planu nie przepisuje historii.
- **Rekord to najcięższa seria**; przy równym ciężarze wygrywa więcej powtórzeń.
- **Bułgary liczą się na obie nogi**: 40 kg × 6 na nogę to 480 kg do sumy.
- **„Ostatnio" przy bułgarach i łydkach bierze się z tego samego dnia** — lżejsze
  bułgary z B nie podpowiadają ciężaru na A.
- **Całkowity ciężar bez zaokrągleń** w podsumowaniu; w profilu dodatkowo w tonach.
