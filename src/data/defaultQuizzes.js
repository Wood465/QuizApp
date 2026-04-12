export const defaultQuizzes = [
  {
    id: "quiz-html-1",
    title: "Osnove HTML",
    topic: "Web",
    difficulty: "easy",
    questions: [
      {
        id: "q1",
        text: "Kateri tag predstavlja glavni naslov strani?",
        options: ["<h1>", "<header>", "<title>", "<p>"],
        answerIndex: 0,
      },
      {
        id: "q2",
        text: "Za povezavo na drugo stran uporabimo:",
        options: ["<img>", "<a>", "<link>", "<section>"],
        answerIndex: 1,
      },
      {
        id: "q3",
        text: "Kateri atribut slike doloca alternativni opis?",
        options: ["title", "src", "alt", "desc"],
        answerIndex: 2,
      },
    ],
  },
  {
    id: "quiz-js-1",
    title: "JavaScript temelji",
    topic: "Programiranje",
    difficulty: "medium",
    questions: [
      {
        id: "q1",
        text: "Kaj vrne izraz `typeof []`?",
        options: ["array", "object", "list", "undefined"],
        answerIndex: 1,
      },
      {
        id: "q2",
        text: "Katera metoda ustvari nov array in ne spremeni obstojecega?",
        options: ["push", "splice", "map", "pop"],
        answerIndex: 2,
      },
      {
        id: "q3",
        text: "Kako deklariramo konstanto?",
        options: ["let", "const", "var", "static"],
        answerIndex: 1,
      },
    ],
  },
  {
    id: "quiz-math-1",
    title: "Matematika in logika",
    topic: "Splosno znanje",
    difficulty: "hard",
    questions: [
      {
        id: "q1",
        text: "Koliko je 12 * 8?",
        options: ["86", "96", "108", "112"],
        answerIndex: 1,
      },
      {
        id: "q2",
        text: "Kaj sledi zaporedju 2, 4, 8, 16, ...?",
        options: ["18", "24", "30", "32"],
        answerIndex: 3,
      },
      {
        id: "q3",
        text: "Ce je A res in B ni res, kateri izraz je resnicen?",
        options: ["A in B", "A ali B", "ne A", "B"],
        answerIndex: 1,
      },
    ],
  },
];
