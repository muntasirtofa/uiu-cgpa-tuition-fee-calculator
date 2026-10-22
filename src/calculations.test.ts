import { describe, expect, it } from 'vitest';
import { calculateInstallments, calculateTermFee, gradeForMark, weightedCgpa, weightedGpa } from './calculations';
import { getProgramFee, programs } from './data';

describe('weighted GPA and CGPA', () => {
  it('matches the supplied 12-credit GPA example', () => {
    const result = weightedGpa([{ credits: 3, gradePoint: 4 }, { credits: 3, gradePoint: 3.33 }, { credits: 2, gradePoint: 2.67 }, { credits: 4, gradePoint: 3.67 }]);
    expect(result.credits).toBe(12);
    expect(result.qualityPoints).toBeCloseTo(42.01);
    expect(result.gpa).toBeCloseTo(3.5008333333);
  });
  it('handles identical grades and F as a weighted grade-point zero', () => {
    expect(weightedGpa([{ credits: 1, gradePoint: 3 }, { credits: 4, gradePoint: 3 }]).gpa).toBe(3);
    expect(weightedGpa([{ credits: 3, gradePoint: 0 }, { credits: 1, gradePoint: 4 }])).toMatchObject({ credits: 4, qualityPoints: 4, gpa: 1 });
  });
  it('uses provided mark boundaries and rejects invalid marks or credits', () => {
    expect(gradeForMark(90).grade).toBe('A');
    expect(gradeForMark(54).grade).toBe('F');
    expect(() => gradeForMark(101)).toThrow();
    expect(() => weightedGpa([{ credits: 0, gradePoint: 4 }])).toThrow();
    expect(() => weightedGpa([{ credits: -1, gradePoint: 4 }])).toThrow();
  });
  it('weights the previous result by its graded credits', () => {
    const current = weightedGpa([{ credits: 3, gradePoint: 4 }, { credits: 3, gradePoint: 3 }]);
    expect(weightedCgpa(3.2, 30, current)).toMatchObject({ credits: 36, cgpa: (3.2 * 30 + 21) / 36 });
  });
});

describe('provided fee data', () => {
  const regular = (credits:number) => [{credits,type:'regular' as const}];
  it('charges a regular trimester course and keeps the fixed fee separate', () => {
    const result=calculateTermFee({courses:regular(12),perCredit:6500,fixedTermFee:6500});
    expect(result.regularTuition).toBe(78000);
    expect(result.fixedTermFee).toBe(6500);
    expect(result.totalCurrentTermFee).toBe(84500);
  });
  it.each([[25,6500],[50,13000],[100,26000]])('applies a %i percent benefit only to regular per-credit tuition', (percentage,savings) => {
    const result=calculateTermFee({courses:regular(4),perCredit:6500,fixedTermFee:6500,benefits:[{type:'academic',percentage}]});
    expect(result.regularBenefitSavings).toBe(savings);
    expect(result.totalCurrentTermFee).toBe(4*6500+6500-savings);
    expect(result.fixedTermFee).toBe(6500);
  });
  it('uses the B.Pharm fixed semester fee, separate from its credit rate', () => {
    const structure=getProgramFee('B.Pharm')!;
    expect(structure.perCredit).toBe(6500);
    expect(structure.fixedTermFee).toBe(9750);
    expect(calculateTermFee({courses:regular(12),perCredit:structure.perCredit!,fixedTermFee:structure.fixedTermFee!}).totalCurrentTermFee).toBe(87750);
  });
  it('keeps BA English and BSSMSJ at their supplied per-credit rates', () => {
    expect(getProgramFee('BA English')?.perCredit).toBe(5525);
    expect(getProgramFee('BSSMSJ')?.perCredit).toBe(5525);
    expect(programs.find(p=>p[0]==='MSCSE')?.[1]).toBeNull();
  });
  it.each(['thesis','project','internship'] as const)('does not discount %s tuition', type => {
    const result=calculateTermFee({courses:[{credits:3,type}],perCredit:6500,fixedTermFee:6500,benefits:[{type:'academic',percentage:100}]});
    expect(result.regularBenefitSavings).toBe(0);
    expect(result.ineligibleCourseTuition).toBe(19500);
    expect(result.totalCurrentTermFee).toBe(26000);
  });
  it('gives the first eligible retake one separate 50 percent reduction', () => {
    const first=calculateTermFee({courses:[{credits:3,type:'retake',firstEligibleRetake:true}],perCredit:6500,fixedTermFee:6500,benefits:[{type:'academic',percentage:50}]});
    const later=calculateTermFee({courses:[{credits:3,type:'retake',firstEligibleRetake:false}],perCredit:6500,fixedTermFee:6500,benefits:[{type:'academic',percentage:50}]});
    expect(first.specialRetakeReduction).toBe(9750);
    expect(first.regularBenefitSavings).toBe(0);
    expect(first.totalCurrentTermFee).toBe(16250);
    expect(later.specialRetakeReduction).toBe(0);
    expect(later.totalCurrentTermFee).toBe(26000);
  });
  it('uses only the highest benefit and never adds waiver and scholarship percentages', () => {
    const result=calculateTermFee({courses:regular(4),perCredit:6500,fixedTermFee:6500,benefits:[{type:'academic',percentage:25},{type:'resultScholarship',percentage:50}]});
    expect(result.selectedBenefit?.percentage).toBe(50);
    expect(result.regularBenefitSavings).toBe(13000);
  });
  it('suppresses a result scholarship after the I-grade/improvement warning while retaining a waiver', () => {
    const scholarship=calculateTermFee({courses:regular(4),perCredit:6500,fixedTermFee:6500,benefits:[{type:'resultScholarship',percentage:100}],resultScholarshipUnavailable:true});
    const waiver=calculateTermFee({courses:regular(4),perCredit:6500,fixedTermFee:6500,benefits:[{type:'academic',percentage:25},{type:'resultScholarship',percentage:100}],resultScholarshipUnavailable:true});
    expect(scholarship.regularBenefitSavings).toBe(0);
    expect(waiver.selectedBenefit?.type).toBe('academic');
    expect(waiver.regularBenefitSavings).toBe(6500);
  });
  it('calculates current-term remaining payment and installments without double deduction', () => {
    const fee=calculateTermFee({courses:regular(12),perCredit:6500,fixedTermFee:6500,benefits:[{type:'academic',percentage:50}],amountPaid:20000});
    expect(fee.totalCurrentTermFee).toBe(45500);
    expect(fee.remainingPayment).toBe(25500);
    const plan=calculateInstallments(fee.totalCurrentTermFee,'trimester',252);
    expect(plan.initialPayment).toBe(20000);
    expect(plan.balance).toBe(25500);
    expect(plan.installments.map(x=>x.amount)).toEqual([10200,7650,7650]);
    expect(fee.remainingPayment).not.toBe(fee.totalCurrentTermFee-plan.initialPayment-fee.amountPaid);
  });
  it('requires confirmation for pre-252 batches and supports the B.Pharm installment schedule', () => {
    expect(calculateInstallments(50000,'trimester',251).needsEarlierConfirmation).toBe(true);
    expect(calculateInstallments(50000,'trimester',251,'no').initialPayment).toBe(0);
    expect(calculateInstallments(50000,'trimester',251,'yes').initialPayment).toBe(20000);
    expect(calculateInstallments(50000,'semester',252).installments.map(x=>x.amount)).toEqual([7500,7500,7500,7500]);
  });
  it('flags a current-term fee below the initial partial payment without negative installments', () => {
    const plan=calculateInstallments(10000,'trimester',252);
    expect(plan.feeBelowInitialPayment).toBe(true);
    expect(plan.balance).toBeNull();
    expect(plan.installments).toHaveLength(0);
  });
  it('rejects invalid course credits and overpayments', () => {
    expect(()=>calculateTermFee({courses:[{credits:0,type:'regular'}],perCredit:6500,fixedTermFee:6500})).toThrow(/credit hours/i);
    expect(()=>calculateTermFee({courses:[{credits:-3,type:'regular'}],perCredit:6500,fixedTermFee:6500})).toThrow(/credit hours/i);
    expect(()=>calculateTermFee({courses:regular(1),perCredit:6500,fixedTermFee:6500,amountPaid:20000})).toThrow(/cannot exceed/i);
  });
});
