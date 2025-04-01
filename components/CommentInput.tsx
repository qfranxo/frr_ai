"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const supabase = createClientComponentClient();

type CommentInputProps = {
  imageId: string;
  onCommentPosted?: () => void;
};

export default function CommentInput({ imageId, onCommentPosted }: CommentInputProps) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ 댓글 등록 함수
  const handleSubmit = async () => {
    if (!isLoaded || !isSignedIn || !user) return;
    
    try {
      setIsSubmitting(true);
      
      // 유저 이름을 직접 가져와서 사용
      const userName = 
        user.fullName || 
        user.username || 
        user.primaryEmailAddress?.emailAddress?.split("@")[0] || 
        "User";

      const { error } = await supabase.from("shared_comments").insert({
        image_id: imageId,
        user_id: user.id,
        user_name: userName, // 상태가 아닌 직접 계산된 값 사용
        text,
      });

      if (error) {
        console.error("❌ 댓글 저장 실패:", error.message);
      } else {
        console.log("✅ 댓글 저장 완료");
        setText("");
        if (onCommentPosted) {
          onCommentPosted();
        }
      }
    } catch (err) {
      console.error("댓글 저장 중 오류 발생:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 버튼 비활성화 조건
  const isButtonDisabled = !text.trim() || !isLoaded || !isSignedIn || isSubmitting;

  return (
    <div className="flex gap-2 items-center">
      <input
        className="w-full border p-2 rounded"
        placeholder={isLoaded && isSignedIn ? "Write a comment..." : "Sign in to comment"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!isLoaded || !isSignedIn}
      />
      <button
        className="bg-indigo-600 text-white p-2 rounded disabled:opacity-50"
        onClick={handleSubmit}
        disabled={isButtonDisabled}
      >
        {isSubmitting ? "..." : "💬"}
      </button>
    </div>
  );
} 