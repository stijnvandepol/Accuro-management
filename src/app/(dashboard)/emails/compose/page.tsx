import { requireSession } from "@/lib/auth";
import { ComposeForm } from "./compose-form";

interface Props {
  searchParams: Promise<{
    replyTo?: string;
    subject?: string;
    replyToEmailId?: string;
    clientId?: string;
    changeRequestId?: string;
  }>;
}

export default async function ComposePage({ searchParams }: Props) {
  await requireSession();
  const params = await searchParams;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {params.replyTo ? "Beantwoorden" : "Nieuwe e-mail"}
          </h1>
        </div>
      </div>
      <ComposeForm
        defaultTo={params.replyTo ?? ""}
        defaultSubject={params.subject ?? ""}
        replyToEmailId={params.replyToEmailId}
        defaultChangeRequestId={params.changeRequestId}
        defaultClientId={params.clientId}
      />
    </div>
  );
}
