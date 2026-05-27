export function formatFirebaseError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const lower = msg.toLowerCase();

  if (
    lower.includes('storage') &&
    (lower.includes('permission') ||
      lower.includes('unauthorized') ||
      lower.includes('not set up') ||
      lower.includes('404'))
  ) {
    return (
      'Cannot upload scene media: Firebase Storage is not ready. ' +
      'In Firebase Console open Storage → Get started, then run ' +
      'npm run firebase:deploy-rules in the Opia folder.'
    );
  }

  if (lower.includes('permission') || lower.includes('insufficient')) {
    return (
      `${msg} — deploy rules with npm run firebase:deploy-rules ` +
      '(Firestore rules are separate from Storage).'
    );
  }

  return msg;
}
