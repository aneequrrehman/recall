import type { ClassificationTestCase, ClassificationCategory } from '../../classification/types'

/**
 * All test cases organized by category.
 * Based on the structured memory implementation plan.
 */
export const testCases: ClassificationTestCase[] = [
  // ============================================
  // Category 1: Clear Matches (should match)
  // ============================================

  // Payments - obvious
  {
    id: 'clear-match-payment-1',
    category: 'clear_match',
    input: 'Paid Jayden $150 for MMA training',
    expected: { matched: true, schema: 'payments' },
  },
  {
    id: 'clear-match-payment-2',
    category: 'clear_match',
    input: 'Sent $50 to my sister',
    expected: { matched: true, schema: 'payments' },
  },
  {
    id: 'clear-match-payment-3',
    category: 'clear_match',
    input: 'Paid rent $2000',
    expected: { matched: true, schema: 'payments' },
  },
  {
    id: 'clear-match-payment-4',
    category: 'clear_match',
    input: 'Gave the plumber $200 for fixing the sink',
    expected: { matched: true, schema: 'payments' },
  },
  {
    id: 'clear-match-payment-5',
    category: 'clear_match',
    input: 'Tipped the waiter $20',
    expected: { matched: true, schema: 'payments' },
  },
  {
    id: 'clear-match-payment-6',
    category: 'clear_match',
    input: 'Bought groceries for $85',
    expected: { matched: true, schema: 'payments' },
  },

  // Workouts - obvious
  {
    id: 'clear-match-workout-1',
    category: 'clear_match',
    input: 'Ran 5km this morning',
    expected: { matched: true, schema: 'workouts' },
  },
  {
    id: 'clear-match-workout-2',
    category: 'clear_match',
    input: 'Did 30 minutes of yoga',
    expected: { matched: true, schema: 'workouts' },
  },
  {
    id: 'clear-match-workout-3',
    category: 'clear_match',
    input: 'Went to the gym for an hour',
    expected: { matched: true, schema: 'workouts' },
  },
  {
    id: 'clear-match-workout-4',
    category: 'clear_match',
    input: 'Swam 20 laps at the pool',
    expected: { matched: true, schema: 'workouts' },
  },
  {
    id: 'clear-match-workout-5',
    category: 'clear_match',
    input: 'Lifted weights for 45 minutes',
    expected: { matched: true, schema: 'workouts' },
  },
  {
    id: 'clear-match-workout-6',
    category: 'clear_match',
    input: 'Had MMA training with Jayden',
    expected: { matched: true, schema: 'workouts' },
  },

  // Medications - obvious
  {
    id: 'clear-match-medication-1',
    category: 'clear_match',
    input: 'Taking 500mg ibuprofen twice daily',
    expected: { matched: true, schema: 'medications' },
  },
  {
    id: 'clear-match-medication-2',
    category: 'clear_match',
    input: 'Started taking vitamin D supplements',
    expected: { matched: true, schema: 'medications' },
  },
  {
    id: 'clear-match-medication-3',
    category: 'clear_match',
    input: 'On 10mg Lexapro for anxiety',
    expected: { matched: true, schema: 'medications' },
  },
  {
    id: 'clear-match-medication-4',
    category: 'clear_match',
    input: 'Taking metformin for diabetes',
    expected: { matched: true, schema: 'medications' },
  },
  {
    id: 'clear-match-medication-5',
    category: 'clear_match',
    input: 'Using melatonin to help with sleep',
    expected: { matched: true, schema: 'medications' },
  },

  // ============================================
  // Category 2: Clear Non-Matches (should NOT match)
  // ============================================

  // General facts - not structured
  {
    id: 'clear-non-match-fact-1',
    category: 'clear_non_match',
    input: 'I love pizza',
    expected: { matched: false },
  },
  {
    id: 'clear-non-match-fact-2',
    category: 'clear_non_match',
    input: 'My name is John',
    expected: { matched: false },
  },
  {
    id: 'clear-non-match-fact-3',
    category: 'clear_non_match',
    input: 'I work at Google',
    expected: { matched: false },
  },
  {
    id: 'clear-non-match-fact-4',
    category: 'clear_non_match',
    input: 'My favorite color is blue',
    expected: { matched: false },
  },
  {
    id: 'clear-non-match-fact-5',
    category: 'clear_non_match',
    input: 'I have two cats',
    expected: { matched: false },
  },

  // Questions/requests - not data
  {
    id: 'clear-non-match-question-1',
    category: 'clear_non_match',
    input: "What's the weather?",
    expected: { matched: false },
  },
  {
    id: 'clear-non-match-question-2',
    category: 'clear_non_match',
    input: 'Can you help me write an email?',
    expected: { matched: false },
  },
  {
    id: 'clear-non-match-question-3',
    category: 'clear_non_match',
    input: 'How do I cook pasta?',
    expected: { matched: false },
  },

  // Intentions, not events
  {
    id: 'clear-non-match-intention-1',
    category: 'clear_non_match',
    input: 'I should work out more',
    expected: { matched: false },
  },
  {
    id: 'clear-non-match-intention-2',
    category: 'clear_non_match',
    input: 'I need to pay my rent soon',
    expected: { matched: false },
  },
  {
    id: 'clear-non-match-intention-3',
    category: 'clear_non_match',
    input: "I'm thinking about starting yoga",
    expected: { matched: false },
  },
  {
    id: 'clear-non-match-intention-4',
    category: 'clear_non_match',
    input: 'I want to try meditation',
    expected: { matched: false },
  },

  // Related topics but not trackable events
  {
    id: 'clear-non-match-related-1',
    category: 'clear_non_match',
    input: 'Money is tight this month',
    expected: { matched: false },
  },
  {
    id: 'clear-non-match-related-2',
    category: 'clear_non_match',
    input: 'I hate running',
    expected: { matched: false },
  },
  {
    id: 'clear-non-match-related-3',
    category: 'clear_non_match',
    input: "My doctor said I'm healthy",
    expected: { matched: false },
  },
  {
    id: 'clear-non-match-related-4',
    category: 'clear_non_match',
    input: 'Exercise is important',
    expected: { matched: false },
  },
  {
    id: 'clear-non-match-related-5',
    category: 'clear_non_match',
    input: "I don't like taking pills",
    expected: { matched: false },
  },

  // ============================================
  // Category 3: Ambiguous but Should Match
  // ============================================

  // Payments - less obvious
  {
    id: 'ambiguous-match-payment-1',
    category: 'ambiguous_match',
    input: 'Jayden charged me $50 for training',
    expected: { matched: true, schema: 'payments' },
  },
  {
    id: 'ambiguous-match-payment-2',
    category: 'ambiguous_match',
    input: 'Owed my friend $30, paid him back',
    expected: { matched: true, schema: 'payments' },
  },
  {
    id: 'ambiguous-match-payment-3',
    category: 'ambiguous_match',
    input: 'Subscription renewed for $15',
    expected: { matched: true, schema: 'payments' },
  },
  {
    id: 'ambiguous-match-payment-4',
    category: 'ambiguous_match',
    input: 'Split the bill, my share was $45',
    expected: { matched: true, schema: 'payments' },
  },

  // Workouts - less obvious
  {
    id: 'ambiguous-match-workout-1',
    category: 'ambiguous_match',
    input: 'Walked 10,000 steps today',
    expected: { matched: true, schema: 'workouts' },
  },
  {
    id: 'ambiguous-match-workout-2',
    category: 'ambiguous_match',
    input: 'Played basketball for an hour',
    expected: { matched: true, schema: 'workouts' },
  },
  {
    id: 'ambiguous-match-workout-3',
    category: 'ambiguous_match',
    input: 'Did some stretching before bed',
    expected: { matched: true, schema: 'workouts' },
  },
  {
    id: 'ambiguous-match-workout-4',
    category: 'ambiguous_match',
    input: 'Hiked up the mountain trail',
    expected: { matched: true, schema: 'workouts' },
  },

  // Medications - less obvious
  {
    id: 'ambiguous-match-medication-1',
    category: 'ambiguous_match',
    input: 'Stopped taking my antidepressants',
    expected: { matched: true, schema: 'medications' },
  },
  {
    id: 'ambiguous-match-medication-2',
    category: 'ambiguous_match',
    input: 'Doubled my vitamin C dose',
    expected: { matched: true, schema: 'medications' },
  },
  {
    id: 'ambiguous-match-medication-3',
    category: 'ambiguous_match',
    input: 'Forgot to take my meds this morning',
    expected: { matched: true, schema: 'medications' },
  },
  {
    id: 'ambiguous-match-medication-4',
    category: 'ambiguous_match',
    input: 'Switched from Advil to Tylenol',
    expected: { matched: true, schema: 'medications' },
  },

  // ============================================
  // Category 4: Partial Information
  // ============================================

  {
    id: 'partial-info-payment-1',
    category: 'partial_information',
    input: 'Paid someone yesterday',
    expected: { matched: true, schema: 'payments' },
    description: 'Missing amount but clear payment',
  },
  {
    id: 'partial-info-payment-2',
    category: 'partial_information',
    input: 'Sent money to mom',
    expected: { matched: true, schema: 'payments' },
    description: 'Missing amount but clear payment',
  },
  {
    id: 'partial-info-workout-1',
    category: 'partial_information',
    input: 'Did some exercise',
    expected: { matched: true, schema: 'workouts' },
    description: 'Vague but still a workout',
  },
  {
    id: 'partial-info-workout-2',
    category: 'partial_information',
    input: 'Worked out yesterday',
    expected: { matched: true, schema: 'workouts' },
    description: 'No details but clear workout',
  },
  {
    id: 'partial-info-medication-1',
    category: 'partial_information',
    input: 'Taking something for my headaches',
    expected: { matched: true, schema: 'medications' },
    description: 'Vague medication name',
  },

  // ============================================
  // Category 5: Multiple Schemas Could Apply
  // ============================================

  {
    id: 'multi-schema-1',
    category: 'multi_schema',
    input: 'Paid $100 for gym membership',
    expected: { matched: true, schema: 'payments' },
    description: 'Payment for workout - transaction is primary',
  },
  {
    id: 'multi-schema-2',
    category: 'multi_schema',
    input: 'Bought protein powder for $50',
    expected: { matched: true, schema: 'payments' },
    description: 'Payment for fitness item - transaction is primary',
  },
  {
    id: 'multi-schema-3',
    category: 'multi_schema',
    input: 'Spent $200 on prescriptions',
    expected: { matched: true, schema: 'payments' },
    description: 'Medication cost - transaction is primary',
  },
  {
    id: 'multi-schema-4',
    category: 'multi_schema',
    input: 'MMA session with Jayden today, great workout',
    expected: { matched: true, schema: 'workouts' },
    description: 'Activity is primary, not a payment',
  },

  // ============================================
  // Category 6: Tricky Non-Matches
  // ============================================

  // Mentions money but not a transaction
  {
    id: 'tricky-non-match-money-1',
    category: 'tricky_non_match',
    input: 'I make $80,000 a year',
    expected: { matched: false },
    description: 'Salary info, not a transaction',
  },
  {
    id: 'tricky-non-match-money-2',
    category: 'tricky_non_match',
    input: 'The car costs $30,000',
    expected: { matched: false },
    description: 'Price info, not a transaction',
  },
  {
    id: 'tricky-non-match-money-3',
    category: 'tricky_non_match',
    input: "I'm saving for a $500 guitar",
    expected: { matched: false },
    description: 'Goal, not a transaction',
  },

  // Mentions exercise but not an event
  {
    id: 'tricky-non-match-exercise-1',
    category: 'tricky_non_match',
    input: 'I used to run marathons',
    expected: { matched: false },
    description: 'Past general reference, not a specific workout',
  },
  {
    id: 'tricky-non-match-exercise-2',
    category: 'tricky_non_match',
    input: 'My gym is closed on Sundays',
    expected: { matched: false },
    description: 'Fact about gym, not a workout',
  },
  {
    id: 'tricky-non-match-exercise-3',
    category: 'tricky_non_match',
    input: 'Running shoes are expensive',
    expected: { matched: false },
    description: 'Opinion about gear, not a workout',
  },

  // Mentions medication but not taking/tracking
  {
    id: 'tricky-non-match-medication-1',
    category: 'tricky_non_match',
    input: 'Ibuprofen is bad for your stomach',
    expected: { matched: false },
    description: 'General knowledge, not medication taken',
  },
  {
    id: 'tricky-non-match-medication-2',
    category: 'tricky_non_match',
    input: 'My mom takes blood pressure medication',
    expected: { matched: false },
    description: 'About someone else, not the user',
  },
  {
    id: 'tricky-non-match-medication-3',
    category: 'tricky_non_match',
    input: "I'm allergic to penicillin",
    expected: { matched: false },
    description: 'Allergy info, not medication being taken',
  },
]

/**
 * Get test cases filtered by category
 */
export function getTestCasesByCategory(category: ClassificationCategory): ClassificationTestCase[] {
  return testCases.filter(tc => tc.category === category)
}

/**
 * All category names for iteration
 */
export const allCategories: ClassificationCategory[] = [
  'clear_match',
  'clear_non_match',
  'ambiguous_match',
  'partial_information',
  'multi_schema',
  'tricky_non_match',
]
