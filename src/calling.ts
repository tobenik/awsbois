import express from "express";
const app = express();
const port = 3000;

const callJobs: {
  number: string;
  task: string;
  promise: { resolve: (value: string) => void; reject: (reason?: any) => void };
}[] = [];

export async function callNumber(number: string, task: string) {
  console.log(`Calling ${number}... ${task}`);

  const taskPromise = new Promise((resolve, reject) => {
    // TODO: Call the number

    callJobs.push({ number, task, promise: { resolve, reject } });
  });

  return taskPromise;
}

interface CallCallbackRequest {
  type: string;
  event_timestamp: number;
  data: {
    agent_id: string;
    conversation_id: string;
    status: string;
    transcript: Array<{
      role: string;
      message: string;
      tool_calls: null;
      tool_results: null;
      feedback: null;
      time_in_call_secs: number;
      conversation_turn_metrics: {
        convai_llm_service_ttfb?: {
          elapsed_time: number;
        };
        convai_llm_service_ttf_sentence?: {
          elapsed_time: number;
        };
      } | null;
    }>;
    metadata: {
      start_time_unix_secs: number;
      call_duration_secs: number;
      cost: number;
      deletion_settings: {
        deletion_time_unix_secs: number;
        deleted_logs_at_time_unix_secs: null;
        deleted_audio_at_time_unix_secs: null;
        deleted_transcript_at_time_unix_secs: null;
        delete_transcript_and_pii: boolean;
        delete_audio: boolean;
      };
      feedback: {
        overall_score: null;
        likes: number;
        dislikes: number;
      };
      authorization_method: string;
      charging: {
        dev_discount: boolean;
      };
      termination_reason: string;
    };
    analysis: {
      evaluation_criteria_results: Record<string, unknown>;
      data_collection_results: Record<string, unknown>;
      call_successful: string;
      transcript_summary: string;
    };
    conversation_initiation_client_data: {
      conversation_config_override: {
        agent: {
          prompt: null;
          first_message: null;
          language: string;
        };
        tts: {
          voice_id: null;
        };
      };
      custom_llm_extra_body: Record<string, unknown>;
      dynamic_variables: {
        phone: string;
      };
    };
  };
}

app.get("/call-callback", (req, res) => {
  const request = req.body as CallCallbackRequest;

  if (request.type === "post_call_transcription") {
    const job = callJobs.find(
      (job) =>
        job.number ===
        request.data.conversation_initiation_client_data.dynamic_variables.phone
    );
    if (job) {
      console.log(`Found call job for ${job.number} with task: ${job.task}`);
      const index = callJobs.findIndex((j) => j.number === job.number);
      if (index !== -1) {
        callJobs.splice(index, 1);
      }
    }

    job?.promise.resolve(
      request.data.transcript.map((t) => `${t.role}: ${t.message}`).join("\n")
    );
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
