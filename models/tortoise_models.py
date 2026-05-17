from tortoise import fields, models

class Lead(models.Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255)
    phone = fields.CharField(max_length=20, unique=True)
    company = fields.CharField(max_length=255, null=True)
    status = fields.CharField(max_length=50, default="new")  # new, qualified, cold
    score = fields.IntField(default=0)
    hubspot_id = fields.CharField(max_length=100, null=True)
    reschedule_time = fields.DatetimeField(null=True)

    class Meta:
        table = "leads"

class CallRecord(models.Model):
    id = fields.IntField(pk=True)
    lead = fields.ForeignKeyField("models.Lead", related_name="calls", null=True)
    vapi_call_id = fields.CharField(max_length=255, unique=True, null=True)
    transcript = fields.TextField(null=True)
    sentiment = fields.CharField(max_length=50, null=True)
    intent = fields.CharField(max_length=50, null=True)
    status = fields.CharField(max_length=50)
    recording_url = fields.CharField(max_length=500, null=True)
    duration = fields.IntField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "call_records"

class Assistant(models.Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=100)
    vapi_assistant_id = fields.CharField(max_length=255, unique=True) # ID from Vapi Dashboard
    system_prompt = fields.TextField()
    first_message = fields.TextField()
    voice_id = fields.CharField(max_length=100, default="Layla")
    model_provider = fields.CharField(max_length=50, default="openai")
    model_name = fields.CharField(max_length=50, default="gpt-4")
    is_active = fields.BooleanField(default=False)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "assistants"

        