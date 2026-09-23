import fs from 'fs';
import path from 'path';

describe('Apple Privacy Manifest Compliance (WP-10 Task 10.02)', () => {
  const appJsonPath = path.resolve(__dirname, '../../app.json');
  const xcprivacyPath = path.resolve(__dirname, '../../PrivacyInfo.xcprivacy');

  it('1. app.json defines complete privacyManifests configuration for Expo iOS builds', () => {
    const raw = fs.readFileSync(appJsonPath, 'utf8');
    const appJson = JSON.parse(raw);
    const manifests = appJson.expo?.ios?.privacyManifests;

    expect(manifests).toBeDefined();
    expect(manifests.NSPrivacyTracking).toBe(false);
    expect(manifests.NSPrivacyTrackingDomains).toEqual([]);

    const accessedApis: Array<{
      NSPrivacyAccessedAPIType: string;
      NSPrivacyAccessedAPITypeReasons: string[];
    }> = manifests.NSPrivacyAccessedAPITypes;
    expect(accessedApis).toBeDefined();

    // Verify all 4 required reason API categories
    const apiTypes = accessedApis.map((a) => a.NSPrivacyAccessedAPIType);
    expect(apiTypes).toContain('NSPrivacyAccessedAPITypeUserDefaults');
    expect(apiTypes).toContain('NSPrivacyAccessedAPITypeFileTimestamp');
    expect(apiTypes).toContain('NSPrivacyAccessedAPITypeSystemBootTime');
    expect(apiTypes).toContain('NSPrivacyAccessedAPITypeDiskSpace');

    // Verify reason codes
    const userDefaults = accessedApis.find(
      (a) => a.NSPrivacyAccessedAPIType === 'NSPrivacyAccessedAPITypeUserDefaults',
    );
    expect(userDefaults?.NSPrivacyAccessedAPITypeReasons).toContain('CA92.1');

    const fileTimestamp = accessedApis.find(
      (a) => a.NSPrivacyAccessedAPIType === 'NSPrivacyAccessedAPITypeFileTimestamp',
    );
    expect(fileTimestamp?.NSPrivacyAccessedAPITypeReasons).toContain('C617.1');

    const bootTime = accessedApis.find(
      (a) => a.NSPrivacyAccessedAPIType === 'NSPrivacyAccessedAPITypeSystemBootTime',
    );
    expect(bootTime?.NSPrivacyAccessedAPITypeReasons).toContain('35F9.1');

    const diskSpace = accessedApis.find(
      (a) => a.NSPrivacyAccessedAPIType === 'NSPrivacyAccessedAPITypeDiskSpace',
    );
    expect(diskSpace?.NSPrivacyAccessedAPITypeReasons).toContain('E174.1');
  });

  it('2. app.json declares accurate non-tracking data collection types', () => {
    const raw = fs.readFileSync(appJsonPath, 'utf8');
    const appJson = JSON.parse(raw);
    const manifests = appJson.expo?.ios?.privacyManifests;

    const collectedTypes: Array<{
      NSPrivacyCollectedDataType: string;
      NSPrivacyCollectedDataTypeLinked: boolean;
      NSPrivacyCollectedDataTypeTracking: boolean;
    }> = manifests.NSPrivacyCollectedDataTypes;

    expect(collectedTypes).toBeDefined();
    const fitnessData = collectedTypes.find(
      (c) => c.NSPrivacyCollectedDataType === 'NSPrivacyCollectedDataTypeFitness',
    );
    expect(fitnessData).toBeDefined();
    expect(fitnessData?.NSPrivacyCollectedDataTypeTracking).toBe(false);
    expect(fitnessData?.NSPrivacyCollectedDataTypeLinked).toBe(false);

    const crashData = collectedTypes.find(
      (c) => c.NSPrivacyCollectedDataType === 'NSPrivacyCollectedDataTypeCrashData',
    );
    expect(crashData).toBeDefined();
    expect(crashData?.NSPrivacyCollectedDataTypeTracking).toBe(false);
    expect(crashData?.NSPrivacyCollectedDataTypeLinked).toBe(false);
  });

  it('3. PrivacyInfo.xcprivacy exists and matches XML plist specification', () => {
    expect(fs.existsSync(xcprivacyPath)).toBe(true);
    const content = fs.readFileSync(xcprivacyPath, 'utf8');

    expect(content).toContain('<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"');
    expect(content).toContain('<key>NSPrivacyTracking</key>');
    expect(content).toContain('<false/>');
    expect(content).toContain('NSPrivacyAccessedAPITypeUserDefaults');
    expect(content).toContain('CA92.1');
    expect(content).toContain('NSPrivacyAccessedAPITypeFileTimestamp');
    expect(content).toContain('C617.1');
    expect(content).toContain('NSPrivacyAccessedAPITypeSystemBootTime');
    expect(content).toContain('35F9.1');
    expect(content).toContain('NSPrivacyAccessedAPITypeDiskSpace');
    expect(content).toContain('E174.1');
    expect(content).toContain('NSPrivacyCollectedDataTypeFitness');
    expect(content).toContain('NSPrivacyCollectedDataTypeCrashData');
  });
});
