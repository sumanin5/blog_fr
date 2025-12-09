import { useState } from "react";
import { useAuth } from "@/contexts";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // 阻止表单默认提交行为
    setIsSubmitting(true);
    setError("");
    try {
      if (!username || !password || !email) {
        throw new Error("请输入用户名、密码和邮箱");
      }
      await register({ email, password, username });
      navigate("/login");
    } catch (err) {
      setError(err as string);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-900"></div>
  );
}
