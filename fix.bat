@echo off
echo ========================================
echo 🔧 ARREGLANDO CLASES DUPLICADAS ANDROIDX
echo ========================================

echo.
echo ✅ PASO 1: Limpiando cache y builds antiguos...
if exist ".gradle" rmdir /s /q ".gradle"
if exist "build" rmdir /s /q "build"
if exist "app\build" rmdir /s /q "app\build"

echo.
echo ✅ PASO 2: Gradle clean...
call gradlew clean

echo.
echo ✅ PASO 3: Eliminando dependencias en cache...
call gradlew --refresh-dependencies

echo.
echo ✅ PASO 4: Intentando build debug primero...
call gradlew assembleDebug --no-daemon

if %errorlevel% equ 0 (
    echo.
    echo ✅ DEBUG EXITOSO! Intentando release...
    call gradlew assembleRelease --no-daemon
    
    if %errorlevel% equ 0 (
        echo.
        echo 🎉 ¡BUILD RELEASE EXITOSO!
        echo El APK está en: app\build\outputs\apk\release\
    ) else (
        echo.
        echo ⚠️ DEBUG funcionó pero RELEASE falló
        echo Usa gradlew assembleDebug para desarrollo
    )
) else (
    echo.
    echo ❌ BUILD falló. Revisa los errores arriba.
    echo Ejecuta: gradlew assembleDebug --stacktrace
)

echo.
echo ========================================
echo 🎯 PROCESO COMPLETADO
echo ========================================
pause