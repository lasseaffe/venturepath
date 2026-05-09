// Budget engine — expense splitting and settlement calculations

/**
 * Compute each member's net balance from a list of expenses.
 * Positive = others owe this person. Negative = this person owes others.
 * @param {Array} expenses  - [{ id, description, amount, paidBy, splitType, customSplit }]
 * @param {string[]} members - ['lead','scout','medic']
 * @returns {Record<string,number>}
 */
export function computeBalances(expenses, members) {
  const balances = Object.fromEntries(members.map(m => [m, 0]));

  for (const exp of expenses) {
    const { amount, paidBy, splitType, customSplit } = exp;

    // Determine each member's share
    let shares = {};
    if (splitType === 'equal') {
      const share = amount / members.length;
      members.forEach(m => { shares[m] = share; });
    } else {
      // custom: customSplit is { member: amount }
      shares = { ...customSplit };
    }

    // Payer gets credited the full amount, each member debited their share
    balances[paidBy] += amount;
    members.forEach(m => { balances[m] -= shares[m] ?? 0; });
  }

  // Round to 2dp to avoid floating-point drift
  return Object.fromEntries(Object.entries(balances).map(([k, v]) => [k, Math.round(v * 100) / 100]));
}

/**
 * Compute minimum-transaction settlement from net balances.
 * @param {Record<string,number>} balances
 * @returns {Array<{ from: string, to: string, amount: number }>}
 */
export function computeSettlements(balances) {
  const creditors = [];
  const debtors = [];

  for (const [member, bal] of Object.entries(balances)) {
    if (bal > 0.005) creditors.push({ member, amount: bal });
    else if (bal < -0.005) debtors.push({ member, amount: -bal });
  }

  // Sort descending by amount for greedy matching
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];

  while (creditors.length && debtors.length) {
    const creditor = creditors[0];
    const debtor = debtors[0];
    const settled = Math.min(creditor.amount, debtor.amount);

    transactions.push({
      from: debtor.member,
      to: creditor.member,
      amount: Math.round(settled * 100) / 100,
    });

    creditor.amount -= settled;
    debtor.amount -= settled;

    if (creditor.amount < 0.005) creditors.shift();
    if (debtor.amount < 0.005) debtors.shift();
  }

  return transactions;
}

/**
 * Compute total trip spend and per-member paid amounts.
 */
export function computeTotals(expenses, members) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const paid = Object.fromEntries(members.map(m => [
    m,
    expenses.filter(e => e.paidBy === m).reduce((s, e) => s + e.amount, 0),
  ]));
  return { total: Math.round(total * 100) / 100, paid };
}
