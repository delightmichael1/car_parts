import { Preferences } from "@capacitor/preferences";

function usePreferenceStorage() {
  const setPreference = async (key: string, value: unknown) => {
    const jsonstring = JSON.stringify(value);
    await Preferences.set({
      key: key,
      value: jsonstring,
    });
  };

  const getPreference = async (key: string) => {
    const { value } = await Preferences.get({ key: key });
    if (value) {
      return JSON.parse(value);
    } else {
      return null;
    }
  };

  const removePreference = async (key: string) => {
    await Preferences.remove({ key: key });
  };

  return { setPreference, getPreference, removePreference };
}

export default usePreferenceStorage;
