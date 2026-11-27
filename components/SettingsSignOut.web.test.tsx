import { shouldSignOutOnWeb } from '../app/(tabs)/settings';
import { readFileSync } from 'fs';
import path from 'path';

describe('Settings sign out on web', () => {
  it('logs out only when the browser confirmation is accepted', () => {
    const message = 'Are you sure you want to sign out? You can sign back in anytime.';
    const confirm = jest.fn().mockReturnValue(true);
    const logout = jest.fn();

    if (shouldSignOutOnWeb(confirm, message)) logout();

    expect(confirm).toHaveBeenCalledWith(message);
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('keeps the session when the browser confirmation is cancelled', () => {
    const confirm = jest.fn().mockReturnValue(false);
    const logout = jest.fn();

    if (shouldSignOutOnWeb(confirm, 'Sign out?')) logout();

    expect(logout).not.toHaveBeenCalled();
  });

  it('keeps the sign-out button reachable for signed-in users and preserves native Alert', () => {
    const source = readFileSync(path.join(__dirname, '../app/(tabs)/settings.tsx'), 'utf8');
    expect(source).toContain("{user && !user.isAnonymous ? (");
    expect(source).toContain('onPress={handleSignOut}');
    expect(source).toContain("if (Platform.OS === 'web')");
    expect(source).toContain("Alert.alert(");
    expect(source).toContain("'Sign Out'");
  });
});
