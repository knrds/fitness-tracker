import { Alert, type AlertButton } from 'react-native';
import { scopedAlert } from '../scopedAlert';
import {
  beginScopeChange,
  completeScopeChange,
  selectStoragePartition,
} from '../../data/storageScope';

it('does not execute an old native confirmation after changing away and back to the same account', () => {
  let buttons: AlertButton[] | undefined;
  const nativeAlert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, actions) => {
    buttons = actions;
  });
  const deleteData = jest.fn();
  scopedAlert.alert('Delete?', 'Confirm deletion', [{ text: 'Delete', onPress: deleteData }]);
  const generation = beginScopeChange();
  selectStoragePartition('legacy', generation);
  completeScopeChange(generation);
  buttons?.[0]?.onPress?.();
  expect(deleteData).not.toHaveBeenCalled();
  scopedAlert.alert('Delete?', 'New confirmation', [{ text: 'Delete', onPress: deleteData }]);
  buttons?.[0]?.onPress?.();
  expect(deleteData).toHaveBeenCalledTimes(1);
  nativeAlert.mockRestore();
});
