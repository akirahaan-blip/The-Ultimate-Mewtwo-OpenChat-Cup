@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo ================================================
echo  最強ミュウツーオプチャ杯 スコアチェッカー
echo ================================================
echo.
echo  ブラウザが自動で開きます。
echo  終わるときは、この黒い画面で Ctrl + C を押すか、
echo  画面右上の × で閉じてください。
echo.

start "" http://localhost:5599/
python -m http.server 5599

pause
