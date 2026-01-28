const serviceAccount = {
    "type": "service_account",
    "project_id": "gift-phase-5c187",
    "private_key_id": "2ce8693fbfb01a9430aa2fb59072784a1fa6a1d7",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDby+xE5lFgaEhl\nEX3ngK7mN67+kOCUlhF54ugH0aDK+yOeZvHivWqWAYhssAXBa8Jar8J5etdipKNf\nfDwmFBG+5hmd/mMt6c0Z3TzEhH1EZRUyJQLxP/PvVYqNkh0lLJfkh6+sDvtV+QAU\n50eUtt1UD/bv3jiQTs+HTXh6RwBixc57UPXu4Mxsvi1NFB8vdHbGWanLcIuaKSuN\nbSwu5Dczgd1tCf8ZRIexVUYQDdzYqqM25mZtuh0wnUPvSRx5IRiyEnW1euEoEJLy\nmfxVzUXnfaHucRsgr6n8ldaCO8+J61g9gxyr1LIlJgd+mU2r4nXJ1ZVhKr4PGboH\n2Hh/qg7fAgMBAAECggEAR81+8mUxSWbX25iSwmmB+XhQZR4sF65MqD5NoZxERHs1\ngB5OP820P6vhhuwb/Tt4Qwru46OTMEjrjBp4RdJBl9TwonIDsXCTDbN+Eg7cI1dI\nTNjVdL15MYMG38fPWKEQP9pps7IzPjs5YRrLAhSZCkiq2WKFpPLyDdfrlzqRsDIm\nV0d/79IjsS23zgNSRJYb9DQeifcmffahiq22WCwQO/aTjizy8/DXDPvQdkF0TTW4\njU6/qnNdgXxOt8ee9JShCwaNWNyAPfBsEc/LZQAs/BS/jVDHTO7jzNeKLY1VCtkN\n5nJY1M1s7Q+kcrEpZIBmGbRvuLUk7WuyrnFKd17MXQKBgQD59Ye4zXJyPJi524c+\nyn3pdBmYLphoHEpMwBV23otT44IWBypFLV7lczgyJ5XICgmgk6/H4OJSuUbpTZL6\nPKaNMwrbOjUGnIoSjMHgxvhxA1lnqw2wSnPhZiYqOEh7nk3qxY86to/x7MOzfkiH\ns+OB0LJ766VNNCfrbqHHejuJdQKBgQDhG8fNI/0wLBmNupuibT64Ssg0scRu+hBO\nyNsHdLp6h8CaLCHNAbQhb0QF+6M8CYAf5AlLpEv8jp7UsNt5Pb7ChyK32Yc2CwYz\nFD4+mGV5Lnipm+LsNl++C2R/qDjH3L0oyrA0+dPDdfmyEkSiuP1HHHJUV1Md7LAN\ndNV3u1jYgwKBgQC8kJ1yrIpJ46zTiOjeVaPnGc61H3GaGL10aPPIWNqCzn60X3Nj\n/HY6YlFihLpZzji1CrTw9JXIEj2Mgxj97gM3QepOt/qIok8G72jTSUbi+sPXkRMi\niwggYg8oio0jtKjTE3aZtF+jAhogroPI28wlgmsjUQHC3DXBRhSFh5CigQKBgQC6\nphIw4hpZCvfVMFlDgFl07Wy7ZHp/mhBTgu85a2wDlPP54YXVOghlgKBiZZeffDEk\nQCwE8CGhM5A2wr339V5qZSpATrlx8god6DcEJ9BbflDGMV8ihKM2LLQTtSP/c+PU\nItuf0VXox7VWFReb5M79W3TgwddFBK+lOK6XLFwqiQKBgEU3EwFy2D+nRm8ji82V\naaJZnpIjIHpXY6IAaL1U28WqOoYUzjNr593OJ/Tq5uwLRYhNcXfDzD7Ug2gS71K0\nz1Fmk3vj++QNPmCQeSU9xclE3vBuxN7tP+oYBACElsiNpwY4jjbxEyNRY7l8ighk\nRy+fFhQxmAdpJGuuvcm78TPk\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-fbsvc@gift-phase-5c187.iam.gserviceaccount.com",
    "client_id": "111879008973707896613",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40gift-phase-5c187.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
};

module.exports = {
    serviceAccount,
    botToken: "8010131469:AAFF8ophAzIBbGtijIlA-dN-dEikejQlqxU",
    tonApiUrl: "https://toncenter.com/api/v2/jsonRPC",
    tonApiKey: "AEMUNTFHNERDDRAAAAABNJXS4FZJZEMRXDMKUTD5I2JUGVKXL2XUYXVJQYAWDNAVMESLWFQ",
    port: process.env.PORT || 8080
};
