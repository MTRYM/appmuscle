/**
 * RecommendationPolicyEngine
 * Validates LLM proposals before they can be sent to the client.
 * The LLM never bypasses this layer.
 */

export interface AdjustmentLimits {
  maximumRepChangePerSet: number;
  maximumSetChangePerExercise: number;
  maximumRelativeLoadIncrease: number;  // e.g. 0.05 = 5%
  maximumRelativeLoadDecrease: number;  // e.g. 0.10 = 10%
  maximumSessionVolumeChange: number;   // e.g. 0.10 = 10%
  maximumExercisesChangedPerSession: number;
}

const DEFAULT_LIMITS: AdjustmentLimits = {
  maximumRepChangePerSet: 2,
  maximumSetChangePerExercise: 1,
  maximumRelativeLoadIncrease: 0.05,
  maximumRelativeLoadDecrease: 0.10,
  maximumSessionVolumeChange: 0.10,
  maximumExercisesChangedPerSession: 2,
};

export interface PolicyViolation {
  field: string;
  reason: string;
  severity: 'blocked' | 'warning';
}

export interface PolicyResult {
  approved: boolean;
  violations: PolicyViolation[];
  filteredChanges: any[];
}

// Fields that always require manual validation regardless of magnitude
const ALWAYS_MANUAL_FIELDS = [
  'exerciseId',     // exercise replacement
  'sessionOrder',   // split change
];

export class RecommendationPolicyEngine {
  private limits: AdjustmentLimits;

  constructor(limits: AdjustmentLimits = DEFAULT_LIMITS) {
    this.limits = limits;
  }

  evaluate(recommendation: any, hasPainFlag: boolean, dataConfidence: string): PolicyResult {
    const violations: PolicyViolation[] = [];
    const filteredChanges: any[] = [];

    if (!recommendation || !Array.isArray(recommendation.proposedChanges)) {
      return { approved: false, violations: [{ field: 'root', reason: 'Invalid recommendation structure', severity: 'blocked' }], filteredChanges: [] };
    }

    // Block ALL increases if pain was reported
    if (hasPainFlag) {
      return {
        approved: false,
        violations: [{ field: 'pain', reason: 'Pain flag is active — no automatic changes allowed', severity: 'blocked' }],
        filteredChanges: [],
      };
    }

    // Block if confidence is too low
    if (dataConfidence === 'low') {
      return {
        approved: false,
        violations: [{ field: 'confidence', reason: 'Confidence too low — insufficient training data', severity: 'blocked' }],
        filteredChanges: [],
      };
    }

    let exercisesChanged = 0;

    for (const change of recommendation.proposedChanges) {
      const changeViolations: PolicyViolation[] = [];

      // Always-manual fields
      if (ALWAYS_MANUAL_FIELDS.includes(change.field)) {
        changeViolations.push({
          field: change.field,
          reason: `Field "${change.field}" always requires manual approval`,
          severity: 'blocked',
        });
      }

      // Load increase check
      if (change.field === 'load' && change.previousValue != null && change.proposedValue != null) {
        const relativeDelta = (change.proposedValue - change.previousValue) / change.previousValue;
        if (relativeDelta > this.limits.maximumRelativeLoadIncrease) {
          changeViolations.push({
            field: 'load',
            reason: `Load increase (${(relativeDelta * 100).toFixed(1)}%) exceeds limit (${(this.limits.maximumRelativeLoadIncrease * 100)}%)`,
            severity: 'blocked',
          });
        }
        if (relativeDelta < -this.limits.maximumRelativeLoadDecrease) {
          changeViolations.push({
            field: 'load',
            reason: `Load decrease (${(Math.abs(relativeDelta) * 100).toFixed(1)}%) exceeds limit (${(this.limits.maximumRelativeLoadDecrease * 100)}%)`,
            severity: 'blocked',
          });
        }
      }

      // Rep change check
      if (change.field === 'repetitions' && change.previousValue != null && change.proposedValue != null) {
        const repDelta = Math.abs(change.proposedValue - change.previousValue);
        if (repDelta > this.limits.maximumRepChangePerSet) {
          changeViolations.push({
            field: 'repetitions',
            reason: `Rep change (${repDelta}) exceeds limit (${this.limits.maximumRepChangePerSet})`,
            severity: 'blocked',
          });
        }
      }

      // Set count change check
      if (change.field === 'numberOfSets' && change.previousValue != null && change.proposedValue != null) {
        const setDelta = Math.abs(change.proposedValue - change.previousValue);
        if (setDelta > this.limits.maximumSetChangePerExercise) {
          changeViolations.push({
            field: 'numberOfSets',
            reason: `Set change (${setDelta}) exceeds limit (${this.limits.maximumSetChangePerExercise})`,
            severity: 'blocked',
          });
        }
      }

      exercisesChanged++;
      if (exercisesChanged > this.limits.maximumExercisesChangedPerSession) {
        changeViolations.push({
          field: 'exercisesChanged',
          reason: `Too many exercises changed in one recommendation (max ${this.limits.maximumExercisesChangedPerSession})`,
          severity: 'blocked',
        });
      }

      // High risk changes always need manual approval
      if (change.riskLevel === 'high' || change.requiresUserApproval) {
        changeViolations.push({
          field: change.field,
          reason: 'High-risk change flagged for manual approval',
          severity: 'warning',
        });
      }

      if (changeViolations.some(v => v.severity === 'blocked')) {
        violations.push(...changeViolations);
        // Don't include this change in filteredChanges
      } else {
        filteredChanges.push({ ...change, policyViolations: changeViolations });
        violations.push(...changeViolations);
      }
    }

    const approved = violations.filter(v => v.severity === 'blocked').length === 0;
    return { approved, violations, filteredChanges };
  }
}

export const policyEngine = new RecommendationPolicyEngine();
