{ pkgs ? import <nixpkgs> {
    config = {
      allowUnfree = true;
      android_sdk.accept_license = true;
    };
  }
}:

let
  androidComposition = pkgs.androidenv.composeAndroidPackages {
    platformVersions = [ "35" "36" ];
    buildToolsVersions = [ "35.0.0" "36.0.0" ];
    includeNDK = true;
    ndkVersions = [ "27.1.12297006" ];
    cmakeVersions = [ "3.22.1" ];
    includeSources = false;
    includeSystemImages = false;
    abiVersions = [ "arm64-v8a" "armeabi-v7a" ];
    extraLicenses = [
      "android-sdk-license"
      "android-sdk-preview-license"
      "android-googletv-license"
      "android-sdk-arm-dbt-license"
      "google-gdk-license"
      "intel-android-extra-license"
      "intel-android-sysimage-license"
      "mips-android-sysimage-license"
    ];
  };

  androidSdk = androidComposition.androidsdk;
in
pkgs.mkShell {
  buildInputs = with pkgs; [
    androidSdk
    jdk17
    nodejs_20
    gradle
  ];

  ANDROID_HOME = "${androidSdk}/libexec/android-sdk";
  ANDROID_SDK_ROOT = "${androidSdk}/libexec/android-sdk";
  JAVA_HOME = "${pkgs.jdk17}";

  shellHook = ''
    echo "========================================="
    echo " Android SDK Development Shell"
    echo "========================================="
    echo "ANDROID_HOME=$ANDROID_HOME"
    echo "JAVA_HOME=$JAVA_HOME"
    echo ""

    # Create local.properties for Gradle
    echo "sdk.dir=$ANDROID_HOME" > android/local.properties
    echo "✓ Created android/local.properties"
    echo "========================================="
  '';
}
