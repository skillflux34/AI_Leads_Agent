from datetime import datetime, timedelta


class AILogicEngine:
    @staticmethod
    def process_outcome(analysis: dict):
        """
        Logic for Phase 5: Workflow Automation.
        Normalises to lowercase before comparing so Title Case values from
        Groq ("Busy", "Interested", "Not Interested") match correctly.
        """
        sentiment = (analysis.get("sentiment") or "neutral").lower()
        intent    = (analysis.get("intent")    or "unknown").lower()

        decision = {
            "follow_up": False,
            "mark_cold": False,
            "retry": False,
            "reschedule": False,
        }

        if intent == "busy" and sentiment == "positive":
            decision["reschedule"] = True
        elif intent == "interested" or sentiment == "positive":
            decision["follow_up"] = True
        elif intent == "not interested":
            decision["mark_cold"] = True
        elif intent in ("callback", "asking questions"):
            decision["retry"] = True

        return decision
    

    @staticmethod
    def get_reschedule_time():
        """Default reschedule: 2 hours from now."""
        return datetime.utcnow() + timedelta(hours=2)

