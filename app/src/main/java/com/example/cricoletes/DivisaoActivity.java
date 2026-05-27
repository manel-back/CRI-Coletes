package com.example.cricoletes;

import android.graphics.Color;
import android.os.Bundle;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import android.view.View;
import android.view.animation.Transformation;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.ArrayList;

public class DivisaoActivity extends AppCompatActivity {
    LinearLayout container;
    ArrayList<Time> listaTimes;
    View itemAberto = null;
    EditText inputBusca;
    ArrayList<Time> listaFiltrada;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_divisao);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        listaTimes = new ArrayList<>();
        listaFiltrada = new ArrayList<>(listaTimes);
        container = findViewById(R.id.containerTimes);
        findViewById(R.id.btnVoltar).setOnClickListener(v -> finish());

        String divisao = getIntent().getStringExtra("divisao");

        // ---- Atualiza título e linha decorativa com a cor da divisão ----
        TextView txtNome = findViewById(R.id.txtNomeDivisao);
        View linhaCor = findViewById(R.id.linhaCor);

        if (divisao != null) {
            txtNome.setText(divisao);
            int corDivisao = getCorDivisao(divisao);
            txtNome.setTextColor(corDivisao);
            linhaCor.setBackgroundColor(corDivisao);

            // Sombra para destacar (essencial quando a cor é escura, ex: preto)
            if (corDivisao == 0xFF000000) {
                // Preto -> sombra branca forte
                txtNome.setShadowLayer(12f, 0f, 0f, 0xFFFFFFFF);
            } else {
                // Demais cores -> sombra escura sutil para contraste
                txtNome.setShadowLayer(8f, 0f, 2f, 0xCC000000);
            }
        }

        carregarTimes(divisao);

        java.util.Collections.sort(listaTimes, (t1, t2) -> t1.nome.compareToIgnoreCase(t2.nome));

        for (Time t : listaTimes) {
            criarItem(t);
        }
    }

    private int getCorDivisao(String divisao) {
        if (divisao == null) return Color.WHITE;
        switch (divisao) {
            case "1ª Divisão": return 0xFF004AAD; // Azul
            case "2ª Divisão": return 0xFFFFEB3B; // Amarelo
            case "3ª Divisão": return 0xFFE53935; // Vermelho
            case "4ª Divisão": return 0xFF81C784; // Verde claro
            case "5ª Divisão": return 0xFF795548; // Marrom
            case "6ª Divisão": return 0xFF000000; // Preto
            case "7ª Divisão": return 0xFF8E24AA; // Roxo
            case "Feminino":   return 0xFFFF4081; // Rosa
            default: return Color.WHITE;
        }
    }

    private void carregarTimes(String divisao) {

        if ("1ª Divisão".equals(divisao)) {
            listaTimes.add(new Time("SLD Agro", "preto", "verde"));
            listaTimes.add(new Time("Gráfica Iporá/JH Consult AG", "preto", ""));
            listaTimes.add(new Time("Rio-Verdense Bebidas", "preto", ""));
            listaTimes.add(new Time("Vila Brasília", "amarelo", ""));
            listaTimes.add(new Time("BR Tendas/Rezetec", "branco", "verde"));
            listaTimes.add(new Time("Farmácia Preço Baixo", "branco", ""));
            listaTimes.add(new Time("Arte Pharma", "vinho", "branco"));
            listaTimes.add(new Time("MAGD Sport/Ibis", "branco", ""));
            listaTimes.add(new Time("Auto Posto Amorinópolis", "vermelho", ""));
            listaTimes.add(new Time("Premium Car Acessórios", "verde claro", ""));
            listaTimes.add(new Time("Amigos do Soquete", "branco", ""));

        } else if ("2ª Divisão".equals(divisao)) {
            listaTimes.add(new Time("Amigos do Moisés", "branco", ""));
            listaTimes.add(new Time("Atlético GO", "vermelho", ""));
            listaTimes.add(new Time("Amigos do Satel", "preto", ""));
            listaTimes.add(new Time("BFF Bruno Ferreira", "azul escuro", ""));
            listaTimes.add(new Time("Fazenda Brejão", "verde escuro", ""));
            listaTimes.add(new Time("Funilaria Santos", "laranja", ""));
            listaTimes.add(new Time("Macedo Eng/UP Mídia", "azul claro", ""));
            listaTimes.add(new Time("Resenha FC", "preto", ""));
            listaTimes.add(new Time("R. Car", "preto", "vermelho"));

        } else if ("3ª Divisão".equals(divisao)) {
            listaTimes.add(new Time("Antena 2", "laranja", ""));
            listaTimes.add(new Time("Drogaria Boa Esperança", "vinho", ""));
            listaTimes.add(new Time("Corinthiano Lanches", "branco", ""));
            listaTimes.add(new Time("FB27/Arrocha 38", "laranja", ""));
            listaTimes.add(new Time("Drogaria Bem Estar", "preto", ""));
            listaTimes.add(new Time("Gelar Ar", "verde claro", ""));
            listaTimes.add(new Time("Líder Gases", "verde", "branco"));
            listaTimes.add(new Time("Odonto Goulart", "azul", ""));
            listaTimes.add(new Time("Gráfica Iporá/JH", "azul", ""));
            listaTimes.add(new Time("Irmãos Rô", "verde escuro", ""));
            listaTimes.add(new Time("PH Cred", "preto", ""));
            listaTimes.add(new Time("Prodent", "branco", "azul"));
            listaTimes.add(new Time("Trilhas da Amazônia", "roxo", ""));

        } else if ("4ª Divisão".equals(divisao)) {
            listaTimes.add(new Time("Bombeiros", "azul claro", ""));
            listaTimes.add(new Time("Beto Motos", "preto", "amarelo"));
            listaTimes.add(new Time("Mega Motos/HB Construtora", "branco", ""));
            listaTimes.add(new Time("Sofrência FC", "cinza", "preto"));
            listaTimes.add(new Time("Baixada/Euro Agronegócios", "preto", ""));
            listaTimes.add(new Time("Cana Verde/Pronet", "verde", ""));
            listaTimes.add(new Time("Odonto Vitta", "amarelo", ""));
            listaTimes.add(new Time("Preço Baixo/Focus", "branco", ""));
            listaTimes.add(new Time("Fazenda Santa Marta", "vinho", ""));
            listaTimes.add(new Time("Caverna FC", "preto", ""));
            listaTimes.add(new Time("Empório Bueno Aires", "rosa", ""));
            listaTimes.add(new Time("Leão Jóias", "preto", ""));
            listaTimes.add(new Time("Roma/Limetal", "azul claro", ""));

        } else if ("5ª Divisão".equals(divisao)) {
            listaTimes.add(new Time("Vivaz Motos", "preto", "amarelo"));
            listaTimes.add(new Time("Novo Tok", "azul claro", ""));
            listaTimes.add(new Time("Pronetlink", "amarelo", ""));
            listaTimes.add(new Time("Auto Peças União", "preto", ""));
            listaTimes.add(new Time("JL Cred/Focus Contab", "laranja", ""));
            listaTimes.add(new Time("Bombeiros", "laranja", ""));
            listaTimes.add(new Time("Tavares Pinturas", "preto", ""));
            listaTimes.add(new Time("BR Mota FC", "vermelho", "preto"));
            listaTimes.add(new Time("Rio Claro", "azul escuro", ""));
            listaTimes.add(new Time("Retif. União/MAD Centro Oeste", "vinho", ""));
            listaTimes.add(new Time("Transp. Melo/Nova Pharma", "verde claro", ""));
            listaTimes.add(new Time("Nova Pharma", "amarelo", "preto"));
            listaTimes.add(new Time("Lanche Cana Verde", "verde claro", ""));
            listaTimes.add(new Time("Pelicano FC", "preto", ""));

        } else if ("6ª Divisão".equals(divisao)) {
            listaTimes.add(new Time("Barbearia Carvalho", "azul escuro", ""));
            listaTimes.add(new Time("Moto Peças Rio Claro", "verde", "preto"));
            listaTimes.add(new Time("Potente/Pague Menos", "azul claro", ""));
            listaTimes.add(new Time("Fazenda Paredão", "preto", ""));
            listaTimes.add(new Time("Agropecuária Santa Marta", "azul claro", "branco"));
            listaTimes.add(new Time("Bar do Miltim", "roxo", ""));
            listaTimes.add(new Time("Deam", "vermelho", ""));
            listaTimes.add(new Time("Center Tintas", "azul escuro", ""));
            listaTimes.add(new Time("Dentel Live", "vermelho", ""));
            listaTimes.add(new Time("Varandas/Nova Pharma", "amarelo", "preto"));
            listaTimes.add(new Time("Moto Bel/FB27", "amarelo", ""));
            listaTimes.add(new Time("Prosper Contabilidade", "azul claro", ""));
            listaTimes.add(new Time("Sítio VL10", "branco", "azul"));
            listaTimes.add(new Time("Abraão Lubrificantes", "verde escuro", ""));

        } else if ("7ª Divisão".equals(divisao)) {
            listaTimes.add(new Time("AUA/Os Cumpade", "azul", "laranja"));
            listaTimes.add(new Time("Ciplan", "azul", ""));
            listaTimes.add(new Time("Fábrica do Povo", "verde claro", ""));
            listaTimes.add(new Time("Fazenda Santa Marta", "branco", ""));
            listaTimes.add(new Time("Jacinto Engenharia", "amarelo", ""));
            listaTimes.add(new Time("Marlive/R. Car", "roxo", ""));
            listaTimes.add(new Time("Prime Clim./Funilaria Anjo", "verde escuro", ""));
            listaTimes.add(new Time("MB Pisos/Tratorauto", "amarelo", ""));
            listaTimes.add(new Time("SAF da Kaburezinha", "vermelho", ""));
            listaTimes.add(new Time("Construtora Freitas", "azul escuro", ""));
            listaTimes.add(new Time("Elcio Tur/Xavante", "verde claro", ""));
            listaTimes.add(new Time("Solutech", "vermelho", ""));
            listaTimes.add(new Time("Shooter Clube de Tiros", "preto", ""));

        } else if ("Feminino".equals(divisao)) {
            listaTimes.add(new Time("LL Pinturas", "vermelho", ""));
            listaTimes.add(new Time("Clínica CSI", "vermelho", ""));
            listaTimes.add(new Time("PS Locações", "azul", ""));
            listaTimes.add(new Time("Bravo 64", "preto", ""));
            listaTimes.add(new Time("Celso Jóias", "preto", ""));
            listaTimes.add(new Time("PH Cred", "azul", ""));
            listaTimes.add(new Time("Fazenda Lua", "preto", ""));
        }
    }

    private void criarItem(Time t) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(20, 20, 20, 20);
        card.setBackgroundResource(R.drawable.card_bg);

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, 0, 0, 20);
        card.setLayoutParams(params);

        TextView nome = new TextView(this);
        nome.setText(t.nome);
        nome.setTextSize(20);
        nome.setTextColor(Color.WHITE);

        LinearLayout detalhes = new LinearLayout(this);
        detalhes.setOrientation(LinearLayout.HORIZONTAL);
        detalhes.setVisibility(View.GONE);

        detalhes.addView(criarCorItem(t.cor1));
        if (!t.cor2.isEmpty()) {
            detalhes.addView(criarCorItem(t.cor2));
        }

        nome.setOnClickListener(v -> {
            if (itemAberto != null && itemAberto != detalhes) {
                collapse(itemAberto);
            }
            if (detalhes.getVisibility() == View.VISIBLE) {
                collapse(detalhes);
                itemAberto = null;
            } else {
                expand(detalhes);
                itemAberto = detalhes;
            }
        });

        card.addView(nome);
        card.addView(detalhes);
        container.addView(card);
    }

    private int getCor(String cor) {
        if (cor == null) return Color.GRAY;
        switch (cor.toLowerCase()) {
            case "vermelho": return Color.RED;
            case "preto": return Color.BLACK;
            case "branco": return Color.WHITE;
            case "verde": return 0xFF4CAF50;
            case "azul": return Color.BLUE;
            case "amarelo": return Color.YELLOW;
            case "laranja": return 0xFFEF6C00;
            case "roxo": return 0xFF800080;
            case "rosa": return 0xFFFF69B4;
            case "vinho": return 0xFF800000;
            case "verde claro": return 0xFF00FF00;
            case "verde escuro": return 0xFF006400;
            case "azul claro": return 0xFF00BFFF;
            case "azul escuro": return 0xFF00008B;
            case "cinza": return Color.GRAY;
            case "marrom": return 0xFF795548;
            default: return Color.GRAY;
        }
    }

    private void expand(final View v) {
        v.measure(View.MeasureSpec.UNSPECIFIED, View.MeasureSpec.UNSPECIFIED);
        final int targetHeight = v.getMeasuredHeight();

        v.getLayoutParams().height = 0;
        v.setVisibility(View.VISIBLE);

        android.view.animation.Animation a = new android.view.animation.Animation() {
            @Override
            protected void applyTransformation(float interpolatedTime, Transformation t) {
                v.getLayoutParams().height =
                        interpolatedTime == 1
                                ? LinearLayout.LayoutParams.WRAP_CONTENT
                                : (int) (targetHeight * interpolatedTime);
                v.requestLayout();
            }
        };
        a.setDuration(200);
        v.startAnimation(a);
    }

    private void collapse(final View v) {
        final int initialHeight = v.getHeight();

        android.view.animation.Animation a = new android.view.animation.Animation() {
            @Override
            protected void applyTransformation(float interpolatedTime, Transformation t) {
                if (interpolatedTime == 1) {
                    v.setVisibility(View.GONE);
                } else {
                    v.getLayoutParams().height =
                            initialHeight - (int)(initialHeight * interpolatedTime);
                    v.requestLayout();
                }
            }
        };
        a.setDuration(200);
        v.startAnimation(a);
    }

    private LinearLayout criarCorItem(String corNome) {
        LinearLayout item = new LinearLayout(this);
        item.setOrientation(LinearLayout.HORIZONTAL);
        item.setPadding(12, 12, 12, 12);
        item.setGravity(android.view.Gravity.CENTER_VERTICAL);

        // Bolinha redonda
        View bolinha = new View(this);
        int tamanho = (int) (28 * getResources().getDisplayMetrics().density); // 28dp
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(tamanho, tamanho);
        lp.setMargins(0, 0, 20, 0);
        bolinha.setLayoutParams(lp);

        int corFill = getCor(corNome);

        // Drawable circular com borda branca sutil
        android.graphics.drawable.GradientDrawable circle = new android.graphics.drawable.GradientDrawable();
        circle.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        circle.setColor(corFill);
        circle.setStroke((int) (1.5f * getResources().getDisplayMetrics().density), 0x66FFFFFF); // borda branca translúcida
        bolinha.setBackground(circle);

        // Sombra/elevação para destacar
        bolinha.setElevation(6f);

        TextView texto = new TextView(this);
        texto.setText(corNome);
        texto.setTextColor(Color.WHITE);
        texto.setTextSize(16);

        item.addView(bolinha);
        item.addView(texto);

        return item;
    }

}
