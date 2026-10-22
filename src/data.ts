export type Grade = { grade: string; point: number; min: number; max: number };
export const grading: Grade[] = [
  { grade: 'A', point: 4, min: 90, max: 100 }, { grade: 'A-', point: 3.67, min: 86, max: 89 },
  { grade: 'B+', point: 3.33, min: 82, max: 85 }, { grade: 'B', point: 3, min: 78, max: 81 },
  { grade: 'B-', point: 2.67, min: 74, max: 77 }, { grade: 'C+', point: 2.33, min: 70, max: 73 },
  { grade: 'C', point: 2, min: 66, max: 69 }, { grade: 'C-', point: 1.67, min: 62, max: 65 },
  { grade: 'D+', point: 1.33, min: 58, max: 61 }, { grade: 'D', point: 1, min: 55, max: 57 },
  { grade: 'F', point: 0, min: 0, max: 54 },
];
export const programs = [
  ['BBA', 125, 6500, 'Undergraduate', '12 trimesters'], ['BBA in AIS', 125, 6500, 'Undergraduate', '12 trimesters'],
  ['BSECO', 122, 6500, 'Undergraduate', '12 trimesters'], ['BSSEDS', 123, 6500, 'Undergraduate', '12 trimesters'],
  ['BSCSE', 141, 6500, 'Undergraduate', '12 trimesters'], ['BSDS', 138, 6500, 'Undergraduate', '12 trimesters'],
  ['BSEEE', 140, 6500, 'Undergraduate', '12 trimesters'], ['Civil', 151.5, 6500, 'Undergraduate', '12 trimesters'],
  ['B.Pharm', 160, 6500, 'Undergraduate', '8 semesters'], ['BA English', 123, 5525, 'Undergraduate', '12 trimesters'],
  ['BSSMSJ', 130, 5525, 'Undergraduate', '12 trimesters'], ['BSBGE', 140, 6500, 'Undergraduate', '12 trimesters'],
  ['MBA', null, null, 'Graduate', 'Unavailable'], ['EMBA', null, null, 'Graduate', 'Unavailable'],
  ['MSECO', null, null, 'Graduate', 'Unavailable'], ['MDS', null, null, 'Graduate', 'Unavailable'], ['MSCSE', null, null, 'Graduate', 'Unavailable'],
] as const;

export const FIXED_TRIMESTER_FEE = 6500;
export const FIXED_BPHARM_SEMESTER_FEE = 9750;
export type TermType = 'trimester' | 'semester';
export function getProgramFee(programName: string) {
  const program = programs.find(p => p[0] === programName);
  if (!program) return null;
  const termType: TermType | null = programName === 'B.Pharm' ? 'semester' : program[4].includes('trimester') ? 'trimester' : null;
  return {
    name: program[0],
    perCredit: program[2],
    termType,
    fixedTermFee: termType === 'semester' ? FIXED_BPHARM_SEMESTER_FEE : termType === 'trimester' ? FIXED_TRIMESTER_FEE : null,
  } as const;
}

export const money = (n: number) => `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 2 }).format(n)}`;
