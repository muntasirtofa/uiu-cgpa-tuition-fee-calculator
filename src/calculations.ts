import { grading, type TermType } from './data';

export type CourseValue = { credits: number; gradePoint: number };
export function weightedGpa(courses: CourseValue[]) {
  if (courses.some(c => !Number.isFinite(c.credits) || c.credits <= 0 || !Number.isFinite(c.gradePoint) || c.gradePoint < 0 || c.gradePoint > 4)) throw new Error('Courses require positive credits and grade points from 0 to 4.');
  const credits = courses.reduce((sum, course) => sum + course.credits, 0);
  const qualityPoints = courses.reduce((sum, course) => sum + course.credits * course.gradePoint, 0);
  return { credits, qualityPoints, gpa: credits ? qualityPoints / credits : null };
}
export function gradeForMark(mark: number) {
  if (!Number.isFinite(mark) || mark < 0 || mark > 100) throw new Error('Marks must be between 0 and 100.');
  return grading.find(g => mark >= g.min && mark <= g.max)!;
}
export function weightedCgpa(previousCgpa: number, previousCredits: number, current: ReturnType<typeof weightedGpa>) {
  if (!Number.isFinite(previousCgpa) || previousCgpa < 0 || previousCgpa > 4 || !Number.isFinite(previousCredits) || previousCredits < 0) throw new Error('Previous results are invalid.');
  const credits = previousCredits + current.credits;
  return { credits, cgpa: credits ? (previousCgpa * previousCredits + current.qualityPoints) / credits : null };
}

export type CourseFeeType = 'regular' | 'retake' | 'thesis' | 'project' | 'internship';
export type FeeCourse = { credits: number; type: CourseFeeType; firstEligibleRetake?: boolean };
export type BenefitType = 'academic' | 'nonAcademic' | 'resultScholarship';
export type FeeBenefit = { type: BenefitType; percentage: number };
export function calculateTermFee(input: {
  courses: FeeCourse[];
  perCredit: number;
  fixedTermFee: number;
  benefits?: FeeBenefit[];
  resultScholarshipUnavailable?: boolean;
  amountPaid?: number;
}) {
  const { courses, perCredit, fixedTermFee } = input;
  if (!Number.isFinite(perCredit) || perCredit <= 0 || !Number.isFinite(fixedTermFee) || fixedTermFee < 0) throw new Error('A valid program rate and fixed term fee are required.');
  if (!courses.length || courses.some(c => !Number.isFinite(c.credits) || c.credits <= 0)) throw new Error('Enter positive credit hours for every course.');
  const benefits = input.benefits ?? [];
  if (benefits.some(b => !Number.isFinite(b.percentage) || b.percentage < 0 || b.percentage > 100)) throw new Error('Benefit percentages must be between 0 and 100.');
  const allowedBenefits = benefits.filter(b => !(b.type === 'resultScholarship' && input.resultScholarshipUnavailable));
  const selectedBenefit = allowedBenefits.reduce<FeeBenefit | null>((best, benefit) => !best || benefit.percentage > best.percentage ? benefit : best, null);
  const eligibleRegularCredits = courses.filter(c => c.type === 'regular').reduce((n, c) => n + c.credits, 0);
  const regularTuition = eligibleRegularCredits * perCredit;
  const retakeGross = courses.filter(c => c.type === 'retake').reduce((n, c) => n + c.credits * perCredit, 0);
  const firstRetakeTuition = courses.filter(c => c.type === 'retake' && c.firstEligibleRetake).reduce((n, c) => n + c.credits * perCredit, 0);
  const ineligibleCourseTuition = courses.filter(c => ['thesis','project','internship'].includes(c.type)).reduce((n, c) => n + c.credits * perCredit, 0) + retakeGross;
  const specialRetakeReduction = firstRetakeTuition * 0.5;
  const regularBenefitSavings = regularTuition * (selectedBenefit?.percentage ?? 0) / 100;
  const totalCourseTuition = regularTuition + ineligibleCourseTuition - specialRetakeReduction;
  const discountedRegularTuition = regularTuition - regularBenefitSavings;
  const totalCurrentTermFee = discountedRegularTuition + ineligibleCourseTuition - specialRetakeReduction + fixedTermFee;
  const amountPaid = input.amountPaid ?? 0;
  if (!Number.isFinite(amountPaid) || amountPaid < 0 || amountPaid > totalCurrentTermFee) throw new Error('Amount paid must be non-negative and cannot exceed the current-term fee.');
  const totalCredits = courses.reduce((n, c) => n + c.credits, 0);
  return {
    totalCredits, eligibleRegularCredits, regularTuition, ineligibleCourseTuition,
    retakeGross, specialRetakeReduction, selectedBenefit, regularBenefitSavings,
    totalCourseTuition, discountedRegularTuition, fixedTermFee,
    totalCurrentTermFee, amountPaid, remainingPayment: totalCurrentTermFee - amountPaid,
  };
}

export function calculateInstallments(totalFee: number, termType: TermType, batch: number | null, earlierBatchChoice: boolean | 'yes' | 'no' | 'unknown' = false) {
  if (!Number.isFinite(totalFee) || totalFee < 0) throw new Error('Current-term fee must be zero or more.');
  const knownBatch = batch !== null && Number.isInteger(batch) && batch > 0;
  const batchQualifies = knownBatch && batch! >= 252;
  const olderBatchYes = earlierBatchChoice === true || earlierBatchChoice === 'yes';
  const olderBatchNo = earlierBatchChoice === 'no';
  const needsEarlierConfirmation = knownBatch && !batchQualifies && !olderBatchYes && !olderBatchNo;
  const applicable = batchQualifies || (knownBatch && !batchQualifies && olderBatchYes);
  const initialPayment = applicable ? 20000 : 0;
  const feeBelowInitialPayment = applicable && totalFee < initialPayment;
  const balance = applicable ? (feeBelowInitialPayment ? null : totalFee - initialPayment) : totalFee;
  const percentages = termType === 'trimester' ? [40, 30, 30] : [25, 25, 25, 25];
  const installments = balance === null ? [] : percentages.map(percentage => ({ percentage, amount: balance * percentage / 100 }));
  return { knownBatch, applicable, needsEarlierConfirmation, initialPayment, balance, feeBelowInitialPayment, installments };
}
