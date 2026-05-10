User communicates in Indonesian (Bahasa Indonesia) and prefers concise, direct responses. They dislike verbose explanations — get to the point quickly.
§
User develops on Windows (laptop + home PC) and primarily connects to their VPS via VS Code Remote-SSH. Uses PowerShell and .bat shortcuts. Windows usernames vary by device (e.g., AXIOO on laptop, Bear on home PC).
§
User uses SQLyog Enterprise on Windows to connect to MySQL on the VPS and prefers the simplest GUI-based connection flow over manually running SSH tunnel commands.
§
Prefers JS functions encapsulated in JSController objects over global var declarations — considers global scope pollution even with prefix naming as not the right solution. When refactoring inline JS, move functions as methods into the existing JSController object, reference via JSController.controllerName.methodName() for cross-calls. ERB onclick should call JSController.controllerName.methodName() directly.