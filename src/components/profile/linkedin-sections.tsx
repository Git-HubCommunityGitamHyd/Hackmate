import { Linkedin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LinkedInImport } from "@/lib/db/schema";

export function LinkedInSections({
  data,
  linkedinUrl,
}: {
  data: LinkedInImport | null;
  linkedinUrl: string | null;
}) {
  if (!data) return null;

  const hasDetails =
    data.headline ||
    data.about ||
    data.experiences.length > 0 ||
    data.education.length > 0 ||
    data.skills.length > 0;
  if (!hasDetails) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-3">
          <span>LinkedIn profile</span>
          {linkedinUrl && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open LinkedIn profile"
              className="text-[#0A66C2] hover:text-[#004182]"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {data.headline && <p className="text-sm font-medium">{data.headline}</p>}
        {data.about && <p className="text-sm text-muted-foreground whitespace-pre-line">{data.about}</p>}

        {data.experiences.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Experience</h3>
            {data.experiences.map((experience, index) => (
              <div key={`${experience.company}-${experience.title}-${index}`} className="border-l-2 pl-3">
                <p className="text-sm font-medium">
                  {experience.title ?? experience.company}
                </p>
                {experience.title && experience.company && (
                  <p className="text-sm text-muted-foreground">{experience.company}</p>
                )}
                {(experience.startDate || experience.endDate || experience.location) && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[experience.startDate, experience.endDate].filter(Boolean).join(" – ")}
                    {experience.location && ` · ${experience.location}`}
                  </p>
                )}
                {experience.description && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                    {experience.description}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        {data.education.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Education</h3>
            {data.education.map((item, index) => (
              <div key={`${item.school}-${item.degree}-${index}`} className="border-l-2 pl-3">
                <p className="text-sm font-medium">{item.school ?? item.degree}</p>
                {item.school && item.degree && (
                  <p className="text-sm text-muted-foreground">
                    {[item.degree, item.fieldOfStudy].filter(Boolean).join(" · ")}
                  </p>
                )}
                {(item.startDate || item.endDate) && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[item.startDate, item.endDate].filter(Boolean).join(" – ")}
                  </p>
                )}
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        {data.skills.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {data.skills.map((skill) => (
                <Badge key={skill} variant="secondary">{skill}</Badge>
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
