/**
 * Custom hooks for React Query
 *
 * Examples of how to use React Query for data fetching and mutations
 * Uncomment and customize as needed for your specific endpoints
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { config } from "@/config/env";

// Example: Fetch interview questions
/*
export function useGetQuestions(candidateId: string) {
  return useQuery({
    queryKey: ["questions", candidateId],
    queryFn: async () => {
      const response = await fetch(
        `${config.apiBaseUrl}/api/questions/${candidateId}`
      );
      if (!response.ok) throw new Error("Failed to fetch questions");
      return response.json();
    },
    enabled: !!candidateId, // Only fetch if candidateId exists
  });
}
*/

// Example: Submit interview answers
/*
export function useSubmitAnswers() {
  return useMutation({
    mutationFn: async (data: { candidateId: string; answers: string[] }) => {
      const response = await fetch(
        `${config.apiBaseUrl}/api/interview/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error("Failed to submit answers");
      return response.json();
    },
    onSuccess: (data) => {
      // Handle success - e.g., show toast, navigate
      console.log("Answers submitted successfully", data);
    },
    onError: (error) => {
      // Handle error
      console.error("Failed to submit answers", error);
    },
  });
}
*/

// Example: Get interview results
/*
export function useGetResults(candidateId: string) {
  return useQuery({
    queryKey: ["results", candidateId],
    queryFn: async () => {
      const response = await fetch(
        `${config.apiBaseUrl}/api/results/${candidateId}`
      );
      if (!response.ok) throw new Error("Failed to fetch results");
      return response.json();
    },
    enabled: !!candidateId,
  });
}
*/

// Usage in a component:
/*
import { useGetQuestions, useSubmitAnswers } from "@/hooks/useQueries";

export function InterviewComponent({ candidateId }) {
  const { data: questions, isLoading } = useGetQuestions(candidateId);
  const submitMutation = useSubmitAnswers();

  const handleSubmit = (answers: string[]) => {
    submitMutation.mutate({ candidateId, answers });
  };

  if (isLoading) return <div>Loading questions...</div>;

  return (
    <div>
      {questions?.map((q: any) => (
        <div key={q.id}>{q.text}</div>
      ))}
      <button 
        onClick={() => handleSubmit(["answer1", "answer2"])}
        disabled={submitMutation.isPending}
      >
        {submitMutation.isPending ? "Submitting..." : "Submit"}
      </button>
    </div>
  );
}
*/
