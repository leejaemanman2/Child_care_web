export async function getQuestions() {
    const res = await fetch("/questions.json");
    const base = await res.json();
    const local = JSON.parse(localStorage.getItem("questions:local") || "[]");
    return [...local, ...base];
}
export async function getQuestion(id) {
    const all = await getQuestions();
    return all.find(q => String(q.id) === String(id));
}
export async function getAnswers(questionId) {
    const res = await fetch("/answers.json");
    const map = await res.json();
    const local = JSON.parse(localStorage.getItem(`answers:${questionId}`) || "[]");
    return [...(map[String(questionId)] || []), ...local];
}
export async function getExperts() {
    const res = await fetch("/experts.json");
    return res.json();
}
