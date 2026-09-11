import { Alert as NativeAlert } from 'react-native';
import { getStorageScope, isScopeCurrent } from '../data/storageScope';

/** Native alerts can outlive their screen. Their actions belong to the account that opened them. */
export const scopedAlert: Pick<typeof NativeAlert, 'alert'> = {
  alert(title, message, buttons, options) {
    const scope = getStorageScope();
    if (!isScopeCurrent(scope)) return;
    NativeAlert.alert(
      title,
      message,
      buttons?.map((button) => ({
        ...button,
        onPress: () => {
          if (isScopeCurrent(scope)) button.onPress?.();
        },
      })),
      options,
    );
  },
};
