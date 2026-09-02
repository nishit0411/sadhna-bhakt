/**
 * Mock devotee directory. Replace with a Supabase `profiles` table later —
 * every consumer reads through `services/devoteeService.js`, never this file
 * directly, so swapping the data source will not require touching the UI.
 */

export const CURRENT_DEVOTEE_ID = "dev-001";
export const CURRENT_ADMIN_ID = "adm-001";

export const MOCK_DEVOTEES = [
  {
    id: "dev-001",
    name: "Harsh Chachu",
    email: "devotee@example.com",
    phone: "+91 98765 43210",
    centre: "Sri Chaitanya Saraswat Math, Nabadwip",
    mentor: "Bhakti Vaibhav Puri Maharaj",
    role: "devotee",
    avatarColor: "maroon",
    initials: "HC",
    joinedOn: "2024-02-11",
    dikshaStage: "Harinaam",
    initiationDate: "2024-03-10",
    initiationYear: null,
  },
  { id: "dev-002", name: "Aman Das", email: "aman.das@example.com", phone: "+91 91234 56780", centre: "Kolkata Centre", mentor: "Bhakti Vaibhav Puri Maharaj", role: "devotee", avatarColor: "sage", initials: "AD", joinedOn: "2024-05-02", dikshaStage: "Gopal Mantra", initiationDate: null, initiationYear: "2023" },
  { id: "dev-003", name: "Rahul Kumar", email: "rahul.kumar@example.com", phone: "+91 90000 11122", centre: "Delhi Centre", mentor: "Bhakti Sundar Sannyasi Maharaj", role: "devotee", avatarColor: "saffron", initials: "RK", joinedOn: "2025-01-15", dikshaStage: "Initial", initiationDate: null, initiationYear: null },
  { id: "dev-004", name: "Priya Sharma", email: "priya.sharma@example.com", phone: "+91 99887 66554", centre: "Nabadwip Centre", mentor: "Bhakti Vaibhav Puri Maharaj", role: "devotee", avatarColor: "maroon", initials: "PS", joinedOn: "2023-11-20", dikshaStage: "Diksha", initiationDate: "2021-04-18", initiationYear: null },
  { id: "dev-005", name: "Vivek Iyer", email: "vivek.iyer@example.com", phone: "+91 98765 12309", centre: "Chennai Centre", mentor: "Bhakti Sundar Sannyasi Maharaj", role: "devotee", avatarColor: "sage", initials: "VI", joinedOn: "2024-08-09", dikshaStage: "Harinaam", initiationDate: null, initiationYear: "2024" },
  { id: "dev-006", name: "Ananya Roy", email: "ananya.roy@example.com", phone: "+91 97654 32109", centre: "Kolkata Centre", mentor: "Bhakti Vaibhav Puri Maharaj", role: "devotee", avatarColor: "saffron", initials: "AR", joinedOn: "2024-03-30", dikshaStage: "Gopal Mantra", initiationDate: "2024-01-22", initiationYear: null },
  { id: "dev-007", name: "Sourav Ghosh", email: "sourav.ghosh@example.com", phone: "+91 96543 21098", centre: "Nabadwip Centre", mentor: "Bhakti Nirmal Acharya Maharaj", role: "devotee", avatarColor: "maroon", initials: "SG", joinedOn: "2022-06-18", dikshaStage: "Diksha", initiationDate: null, initiationYear: "2020" },
  { id: "dev-008", name: "Meera Nair", email: "meera.nair@example.com", phone: "+91 95432 10987", centre: "Chennai Centre", mentor: "Bhakti Sundar Sannyasi Maharaj", role: "devotee", avatarColor: "sage", initials: "MN", joinedOn: "2025-02-27", dikshaStage: "Initial", initiationDate: null, initiationYear: null },
  { id: "dev-009", name: "Karan Mehta", email: "karan.mehta@example.com", phone: "+91 94321 09876", centre: "Delhi Centre", mentor: "Bhakti Nirmal Acharya Maharaj", role: "devotee", avatarColor: "saffron", initials: "KM", joinedOn: "2023-09-04", dikshaStage: "Harinaam", initiationDate: "2022-11-05", initiationYear: null },
  { id: "dev-010", name: "Divya Menon", email: "divya.menon@example.com", phone: "+91 93210 98765", centre: "Kolkata Centre", mentor: "Bhakti Vaibhav Puri Maharaj", role: "devotee", avatarColor: "maroon", initials: "DM", joinedOn: "2024-12-01", dikshaStage: "Initial", initiationDate: null, initiationYear: null },
  { id: "dev-011", name: "Arjun Verma", email: "arjun.verma@example.com", phone: "+91 92109 87654", centre: "Delhi Centre", mentor: "Bhakti Nirmal Acharya Maharaj", role: "devotee", avatarColor: "sage", initials: "AV", joinedOn: "2023-04-14", dikshaStage: "Gopal Mantra", initiationDate: null, initiationYear: "2022" },
  { id: "dev-012", name: "Kavita Joshi", email: "kavita.joshi@example.com", phone: "+91 91098 76543", centre: "Nabadwip Centre", mentor: "Bhakti Vaibhav Puri Maharaj", role: "devotee", avatarColor: "saffron", initials: "KJ", joinedOn: "2022-10-22", dikshaStage: "Diksha", initiationDate: "2019-02-14", initiationYear: null },
  { id: "dev-013", name: "Rohit Bose", email: "rohit.bose@example.com", phone: "+91 90987 65432", centre: "Chennai Centre", mentor: "Bhakti Sundar Sannyasi Maharaj", role: "devotee", avatarColor: "maroon", initials: "RB", joinedOn: "2025-04-06", dikshaStage: "Initial", initiationDate: null, initiationYear: null },
  { id: "dev-014", name: "Nisha Kapoor", email: "nisha.kapoor@example.com", phone: "+91 89876 54321", centre: "Kolkata Centre", mentor: "Bhakti Nirmal Acharya Maharaj", role: "devotee", avatarColor: "sage", initials: "NK", joinedOn: "2024-07-19", dikshaStage: "Harinaam", initiationDate: null, initiationYear: "2024" },
  { id: "dev-015", name: "Suresh Pillai", email: "suresh.pillai@example.com", phone: "+91 88765 43210", centre: "Chennai Centre", mentor: "Bhakti Sundar Sannyasi Maharaj", role: "devotee", avatarColor: "saffron", initials: "SP", joinedOn: "2023-01-30", dikshaStage: "Diksha", initiationDate: "2020-09-09", initiationYear: null },
  { id: "adm-001", name: "Gauranga Das", email: "admin@example.com", phone: "+91 99000 11223", centre: "Sri Chaitanya Saraswat Math, Nabadwip", mentor: "—", role: "admin", avatarColor: "maroon", initials: "GD", joinedOn: "2019-03-01", dikshaStage: null, initiationDate: null, initiationYear: null },
];

export function getDevoteeById(id) {
  return MOCK_DEVOTEES.find((d) => d.id === id) ?? null;
}

export function getDevoteesOnly() {
  return MOCK_DEVOTEES.filter((d) => d.role === "devotee");
}
