function getRoleNumber(name: string): number | null {
  const match = name.match(/(\d+)$/)
  return match ? Number(match[1]) : null
}

export function groupAssignments<T extends { role_name: string }>(assignments: T[]) {
  const speeches = assignments.filter(assignment => assignment.role_name.startsWith('Speech'))
  const evaluators = assignments.filter(assignment => assignment.role_name.startsWith('Evaluator'))
  const others = assignments.filter(assignment =>
    !assignment.role_name.startsWith('Speech') && !assignment.role_name.startsWith('Evaluator'))
  const pairs = speeches.map(speech => ({
    speech,
    evaluator: evaluators.find(evaluator =>
      getRoleNumber(evaluator.role_name) === getRoleNumber(speech.role_name)) ?? null,
  }))
  const unpaired = evaluators.filter(evaluator => !speeches.some(speech =>
    getRoleNumber(speech.role_name) === getRoleNumber(evaluator.role_name)))

  return { pairs, unpaired, others }
}
