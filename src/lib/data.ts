export type Status = "draft" | "published" | "archived"

export interface Course {
  id: string
  title: string
  description?: string
  /** Learners only see published courses. */
  status: Status
  contentReady?: boolean
  /** Placeholder course without real content yet. */
  sample: boolean
}

export type Week = {
  id: string
  courseId: string
  weekNumber: number
  title: string
  questionCount: number
  status: Status
  contentReady?: boolean
}

export type Question = {
  id: string
  questionText: string
  options: string[]
  correctAnswerIndex: number
  difficulty?: string
  explanation?: string
}

export type AdminQuestion = {
  id: string
  questionText: string
  optionCount: number
  correctAnswerIndex: number
  difficulty: string
  status: Status
  /** May be absent on legacy Firestore records that require content repair. */
  options?: string[]
  topic?: string
  explanation?: string
}

export type Paper = {
  id: string
  courseId: string
  title: string
  year: number
  session: string
  questionCount: number
  status: Status
  contentReady?: boolean
  course?: string
}

export type RequestItem = {
  id: string
  /** Course the request was sent from; older requests may have none. */
  courseId?: string
  /** "report" comes from a week's Report a problem button rather than the feedback form. */
  type: "feedback" | "question" | "request" | "report"
  status: "pending" | "replied" | "invalid"
  message: string
  contact?: string
  createdAt: string
  age: string
  reply?: string
  replyAt?: string
  replyVisible?: boolean
  /** Where the problem is, for error reports. */
  report?: QuestionReport
}

export type ReportIssue = "answer" | "question" | "option" | "other"

/** A learner's report of a mistake in a week's answer key. */
export interface QuestionReport {
  weekId: string
  weekNumber: number
  /** The question's number on the week page; 0 when the report covers the whole week. */
  questionNumber: number
  questionId?: string
  /** The question as the learner saw it, so admins can find it even if numbering changes. */
  questionText?: string
  issue: ReportIssue
  /** Option indexes for wrong-answer reports, when the question's options are known. */
  markedAnswer?: number
  suggestedAnswer?: number
  details: string
}

export const DEFAULT_COURSE_ID = "mental-health-wellbeing"

export const initialCourses: Course[] = [
  {
    id: DEFAULT_COURSE_ID,
    title: "Mental Health and Wellbeing",
    description:
      "Weekly answer keys, practice quizzes and previous-year papers.",
    status: "published",
    sample: false,
  },
  // Sample courses stay empty until an admin adds weeks or papers to them.
  ...[2, 3, 4, 5].map(
    (number): Course => ({
      id: `sample-course-${number}`,
      title: `Sample Course ${number}`,
      status: "draft",
      sample: true,
    }),
  ),
]

export const initialWeeks: Week[] = Array.from({ length: 12 }, (_, i) => ({
  id: `week-${i + 1}`,
  courseId: DEFAULT_COURSE_ID,
  weekNumber: i + 1,
  title: `Mental Health and Wellbeing Week ${i + 1}`,
  questionCount: i === 0 ? 9 : 10,
  status: "published",
}))

export const initialPapers: Paper[] = [
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `pyq-${i + 1}`,
    courseId: DEFAULT_COURSE_ID,
    title: `Mental Health and Wellbeing Week ${i + 1} (2025)`,
    year: 2025,
    session: "July",
    questionCount: 10,
    status: "published" as Status,
  })),
  {
    id: "pyq-13",
    courseId: DEFAULT_COURSE_ID,
    title: "Extra Questions based on Morning Paper",
    year: 2026,
    session: "Oct",
    questionCount: 46,
    status: "published",
  },
]

export interface SavedGroup {
  weekId: string
  questions: Question[]
}

export const savedByWeek: SavedGroup[] = [
  {
    weekId: "week-1",
    questions: [
      {
        id: "w1-q1",
        difficulty: "Easy",
        questionText: "Which behaviour reflects healthy coping?",
        options: [
          "Suppressing feelings",
          "Avoiding problems",
          "Engaging in hobbies",
          "Overthinking situations",
        ],
        correctAnswerIndex: 2,
        explanation:
          "Engaging in hobbies is an adaptive way to manage stress and restore emotional balance.",
      },
      {
        id: "w1-q2",
        difficulty: "Medium",
        questionText:
          "Meher compares herself to influencers and feels inferior. Which theory explains this?",
        options: [
          "Operant conditioning",
          "Cognitive dissonance",
          "Social comparison theory",
          "Behavioral theory",
        ],
        correctAnswerIndex: 2,
        explanation:
          "Social comparison theory explains how people evaluate themselves by comparing with others.",
      },
    ],
  },
  {
    weekId: "week-2",
    questions: [
      {
        id: "w2-q1",
        difficulty: "Easy",
        questionText: "Peer pressure can best be described as:",
        options: [
          "Self-motivation",
          "Family expectations",
          "Personal decision-making",
          "Influence from peers to act in certain ways",
        ],
        correctAnswerIndex: 3,
        explanation:
          "Peer pressure is the influence a peer group exerts on an individual’s choices and behaviour.",
      },
    ],
  },
  {
    weekId: "week-4",
    questions: [
      {
        id: "w4-q1",
        difficulty: "Easy",
        questionText: "Emotional intelligence refers to the ability to:",
        options: [
          "Solve mathematical problems",
          "Understand and manage emotions",
          "Manage time effectively",
          "Memorize information",
        ],
        correctAnswerIndex: 1,
        explanation:
          "Emotional intelligence is the capacity to recognise, understand and manage emotions.",
      },
      {
        id: "w4-q2",
        difficulty: "Easy",
        questionText: "Career Decision Scale (CDS) is used to measure:",
        options: [
          "Intelligence",
          "Career indecision",
          "Emotional intelligence",
          "Personality traits",
        ],
        correctAnswerIndex: 1,
        explanation:
          "The Career Decision Scale assesses the degree of career indecision.",
      },
      {
        id: "w4-q3",
        difficulty: "Easy",
        questionText:
          "Which of the following is an ethical responsibility of a therapist?",
        options: [
          "Making all decisions on behalf of the client",
          "Guaranteeing that therapy will always be successful",
          "Maintaining confidentiality and obtaining informed consent",
          "Sharing client information with friends for advice",
        ],
        correctAnswerIndex: 2,
        explanation:
          "Confidentiality and informed consent are core ethical obligations in therapy.",
      },
      {
        id: "w4-q4",
        difficulty: "Easy",
        questionText: "Social responsibility includes:",
        options: [
          "Helping others",
          "Ignoring society",
          "Competing always",
          "Focusing only on self",
        ],
        correctAnswerIndex: 0,
        explanation:
          "Social responsibility means acting in ways that benefit others and the community.",
      },
    ],
  },
  {
    weekId: "week-5",
    questions: [
      {
        id: "w5-q1",
        difficulty: "easy",
        questionText: "Emotional suppression can lead to:",
        options: [
          "Better emotional health",
          "Improved resilience",
          "Mental health issues",
          "Increased emotional intelligence",
        ],
        correctAnswerIndex: 2,
        explanation:
          "Chronically suppressing emotions is associated with poorer mental health outcomes.",
      },
      {
        id: "w5-q2",
        difficulty: "easy",
        questionText: "Social support contributes to:",
        options: [
          "Emotional suppression",
          "Emotional resilience",
          "Social isolation",
          "Emotional avoidance",
        ],
        correctAnswerIndex: 1,
        explanation:
          "Supportive relationships help people cope with stress and build resilience.",
      },
    ],
  },
  {
    weekId: "week-7",
    questions: [
      {
        id: "w7-q1",
        difficulty: "medium",
        questionText:
          "According to attachment theory, which parenting pattern is most likely to contribute to the development of an anxious attachment style in children?",
        options: [
          "Consistent warmth with predictable responsiveness",
          "Emotionally distant and consistently rejecting caregiving",
          "Inconsistent caregiving with unpredictable responsiveness to the child's needs",
          "Encouraging age-appropriate independence while remaining emotionally available",
        ],
        correctAnswerIndex: 2,
        explanation:
          "Unpredictable caregiving is linked with anxious (ambivalent) attachment.",
      },
    ],
  },
  {
    weekId: "week-8",
    questions: [
      {
        id: "w8-q1",
        difficulty: "Medium",
        questionText:
          "Which strategy helps cultivate resilience during a crisis?",
        options: [
          "Ignoring emotions and focusing only on tasks",
          "Denying the impact of stress",
          "Practicing optimism and emotional awareness",
          "Isolating oneself to prevent burdening others",
        ],
        correctAnswerIndex: 2,
        explanation:
          "Optimism combined with emotional awareness supports adaptive coping in a crisis.",
      },
    ],
  },
  {
    weekId: "week-12",
    questions: [
      {
        id: "w12-q1",
        difficulty: "Easy",
        questionText: "FOMO stands for:",
        options: [
          "Fear of Missing Out",
          "Fear of Mental Overload",
          "Feeling of Mood Oscillation",
          "Focus on Media Output",
        ],
        correctAnswerIndex: 0,
        explanation:
          "FOMO is the anxiety that others are having rewarding experiences without you.",
      },
      {
        id: "w12-q2",
        difficulty: "Easy",
        questionText:
          "Which of the following is a healthy approach to social media use?",
        options: [
          "Checking social media whenever feeling stressed",
          "Comparing your appearance with influencers",
          "Setting boundaries around screen time",
          "Seeking validation through likes and comments",
        ],
        correctAnswerIndex: 2,
        explanation:
          "Setting screen-time boundaries supports healthier, more intentional social media use.",
      },
    ],
  },
]

export const adminWeekQuestions: Record<string, AdminQuestion[]> =
  Object.fromEntries(
    savedByWeek.map(({ weekId, questions }) => [
      weekId,
      questions.map(
        (question): AdminQuestion => ({
          id: question.id,
          questionText: question.questionText,
          options: [...question.options],
          optionCount: question.options.length,
          correctAnswerIndex: question.correctAnswerIndex,
          difficulty: question.difficulty ?? "",
          explanation: question.explanation,
          status: "published",
        }),
      ),
    ]),
  )

// PYQ metadata is present, but no verified question content is included in this preview.
export const adminPaperQuestions: Record<string, AdminQuestion[]> = {}

export const initialRequests: RequestItem[] = [
  {
    id: "req-1",
    courseId: DEFAULT_COURSE_ID,
    type: "feedback",
    status: "replied",
    message: "Add PYQs",
    createdAt: "4 Aug 2026",
    age: "2007h old",
    reply: "We'll do it later.",
    replyAt: "4 Aug 2026",
    replyVisible: true,
  },
  {
    id: "req-2",
    courseId: DEFAULT_COURSE_ID,
    type: "feedback",
    status: "invalid",
    message: "Good Platform For practicing NPTEL",
    createdAt: "1 Aug 2026",
    age: "2070h old",
  },
  {
    id: "req-3",
    courseId: DEFAULT_COURSE_ID,
    type: "feedback",
    status: "invalid",
    message: "Good Website",
    createdAt: "1 Aug 2026",
    age: "2071h old",
  },
  {
    id: "req-4",
    courseId: DEFAULT_COURSE_ID,
    type: "request",
    status: "replied",
    message: "How about taking attendance",
    contact: "noname@gmail.com",
    createdAt: "1 Aug 2026",
    age: "2071h old",
    reply: "Good will do",
    replyAt: "1 Aug 2026",
    replyVisible: false,
  },
]

export type Audience = "all" | "desktop" | "mobile"

export interface Announcement {
  /** Changes on every publish, so learners who saw the last version see the update. */
  id: string
  message: string
  /** The learner popup closes itself after this many seconds. */
  durationSeconds: number
  draft: boolean
  /** Local date-times from the admin form, e.g. "2026-10-25T12:03"; empty means no limit. */
  publishAt: string
  expiresAt: string
  /** "desktop" is the wide layout (1024px and up), "mobile" the compact one below it. */
  audience: Audience
}

export const initialAnnouncement: Announcement = {
  id: "announcement-1",
  message:
    "A set of questions based on the morning exam session has been uploaded to PYQs.",
  durationSeconds: 10,
  draft: false,
  publishAt: "2026-10-25T12:03",
  expiresAt: "2026-10-28T12:03",
  audience: "all",
}

export const weekGradients = [
  "from-purple-500 to-indigo-600",
  "from-teal-400 to-cyan-500",
  "from-orange-400 to-pink-500",
  "from-blue-400 to-purple-500",
  "from-green-400 to-teal-500",
  "from-rose-400 to-orange-500",
  "from-indigo-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-fuchsia-400 to-purple-500",
  "from-amber-400 to-orange-500",
  "from-cyan-400 to-blue-500",
  "from-violet-400 to-fuchsia-500",
]

export const paperGradients = [
  "from-blue-500 to-teal-500",
  "from-orange-500 to-purple-600",
  "from-pink-500 to-rose-600",
  "from-purple-500 to-indigo-600",
  "from-emerald-500 to-cyan-600",
  "from-amber-500 to-orange-600",
]
