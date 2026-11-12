export interface TestAccountData {
  name: string;
  email: string;
  balance: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
}

export function buildAccountData(overrides: Partial<TestAccountData> = {}): TestAccountData {
  const timestamp = Date.now();
  return {
    name: `Test User ${timestamp}`,
    email: `user_${timestamp}@example.com`,
    balance: 1500.00,
    status: 'ACTIVE',
    ...overrides,
  };
}
