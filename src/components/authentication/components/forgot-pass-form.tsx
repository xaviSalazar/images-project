import {
    Link,
    useNavigate,
  } from "react-router-dom";
  import * as React from "react";
  import { useFormik } from "formik";
  import * as Yup from "yup";
  import { cn } from "@/lib/utils";
  import { Icons } from "@/components/ui/icons";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { useStore } from "@/lib/states";
  
  interface ForgotPassFormProps extends React.HTMLAttributes<HTMLDivElement> {}
  
  const validationSchema = Yup.object({
    email: Yup.string()
      .email("Invalid email address")
      .required("Email is required"),
  });
  
  export function ForgotPassForm({ className, ...props }: ForgotPassFormProps) {
    const [forgotPassword, isLoading, isLoggedIn] = useStore((state) => [
      state.forgotPassword,
      state.isLoading,
      state.isLoggedIn,
    ]);
    const navigate = useNavigate();
  
    React.useEffect(() => {
      if (isLoggedIn) navigate("/images-project");
    }, [isLoggedIn]);
  
    const formik = useFormik({
      initialValues: {
        email: "",
      },
      validationSchema,
      onSubmit: async (values) => {
        // Add the host URL to the form values
        const hostUrl = window.location.href;
        const baseUrl = hostUrl.substring(0, hostUrl.indexOf("#/") + 2);
        const updatedValues = { ...values, host: baseUrl };
        forgotPassword(updatedValues);
      },
    });
  
    return (
      <div className={cn("grid gap-4", className)} {...props}>
        <form onSubmit={formik.handleSubmit}>
          <div className="grid gap-2">
            <div className="grid gap-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="name@example.com"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={isLoading}
                {...formik.getFieldProps("email")}
              />
              {formik.touched.email && formik.errors.email ? (
                <div className="text-red-500">{formik.errors.email}</div>
              ) : null}
            </div>
            <Button disabled={isLoading}>
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Reset Password
            </Button>
          </div>
        </form>
        <div className="mt-4 text-center text-sm">
          Don't have an account?{" "}
          <Link to="/registration" className="underline">
            Sign up
          </Link>
        </div>
      </div>
    );
  }
  